/**
 * API Rate Limiting Middleware (OWASP API4:2023 对应修复)
 *
 * 基于滑动窗口算法，使用内存存储（开发环境）+ Redis 适配器（生产环境推荐）。
 * 支持三档速率限制 + 端点分组策略。
 *
 * 配置方式：
 * - 环境变量 RATE_LIMIT_ENABLED=true|false（默认 true）
 * - 环境变量 RATE_LIMIT_<KEY>_MAX=100（每窗口最大请求数）
 * - 环境变量 RATE_LIMIT_<KEY>_WINDOW=60000（窗口大小，毫秒）
 *
 * 速率档位说明：
 * - GLOBAL：所有 /api/v1/* 端点共享限额（默认 1000 req/min）
 * - AUTH：认证密集型端点（/api/v1/* 但仅限高频读端点，默认 300 req/min）
 * - STRICT：敏感操作（创建/删除/批量），默认 30 req/min
 */

import type { Context, MiddlewareHandler, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

// ============================================================
// 类型定义
// ============================================================

/** 限制档位 */
export type RateLimitTier = 'GLOBAL' | 'AUTH' | 'STRICT';

/** 窗口记录 */
interface WindowEntry {
  timestamps: number[];
}

/** 速率限制配置 */
interface RateLimitConfig {
  max: number;
  windowMs: number;
}

/** 速率限制中间件选项 */
export interface RateLimitOptions {
  /** 限制档位，默认 GLOBAL */
  tier?: RateLimitTier;
  /** 覆盖最大请求数 */
  max?: number;
  /** 覆盖窗口大小（毫秒） */
  windowMs?: number;
  /** 自定义限流键（默认使用客户端 IP） */
  keyGenerator?: (c: Context) => string;
}

// ============================================================
// 默认配置
// ============================================================

const ENABLED = process.env.RATE_LIMIT_ENABLED !== 'false';

/** 三档默认速率限制 */
const DEFAULT_TIERS: Record<RateLimitTier, RateLimitConfig> = {
  GLOBAL: {
    max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '1000', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW || '60000', 10), // 1 分钟
  },
  AUTH: {
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '300', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '60000', 10),
  },
  STRICT: {
    max: parseInt(process.env.RATE_LIMIT_STRICT_MAX || '30', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_STRICT_WINDOW || '60000', 10),
  },
};

// ============================================================
// 内存存储
// ============================================================

/** 内存存储：Map<key, WindowEntry> */
const store = new Map<string, WindowEntry>();

/** 定期清理过期记录（每 5 分钟） */
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStore(): void {
  const now = Date.now();
  // 所有档位的窗口最大值
  const maxWindow = Math.max(
    ...Object.values(DEFAULT_TIERS).map((t) => t.windowMs),
  );

  for (const [key, entry] of store) {
    // 移除窗口外的旧时间戳
    entry.timestamps = entry.timestamps.filter((t) => now - t < maxWindow);
    // 如果完全没有时间戳，删除整个条目
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
  lastCleanup = now;
}

/** 获取存储条目的时间戳数组 */
function getTimestamps(key: string): number[] {
  const now = Date.now();

  // 定期清理
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    cleanupStore();
  }

  const entry = store.get(key);
  if (!entry) {
    return [];
  }
  return entry.timestamps;
}

/** 记录一次请求 */
function recordHit(key: string, timestamp: number): void {
  const entry = store.get(key);
  if (entry) {
    entry.timestamps.push(timestamp);
  } else {
    store.set(key, { timestamps: [timestamp] });
  }
}

// ============================================================
// 存储接口（可替换为 Redis 适配器）
// ============================================================

export interface RateLimitStore {
  getTimestamps(key: string): Promise<number[]> | number[];
  recordHit(key: string, timestamp: number): Promise<void> | void;
}

/** 默认内存存储适配器 */
const memoryStore: RateLimitStore = {
  getTimestamps,
  recordHit,
};

let activeStore: RateLimitStore = memoryStore;

/**
 * 设置自定义存储（如生产环境的 Redis 适配器）
 *
 * @example
 * ```ts
 * import { setRateLimitStore } from './rate-limit';
 * import { createRedisStore } from './rate-limit-redis';
 *
 * const redisClient = createClient({ url: process.env.REDIS_URL });
 * setRateLimitStore(createRedisStore(redisClient));
 * ```
 */
export function setRateLimitStore(store: RateLimitStore): void {
  activeStore = store;
}

// ============================================================
// 限流键生成
// ============================================================

/**
 * 从请求中提取客户端 IP
 * 优先从代理头获取（X-Forwarded-For > X-Real-IP），
 * 最后从 Hono connection 获取
 */
function getClientIP(c: Context): string {
  // X-Forwarded-For 头（取第一个 IP）
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',');
    const firstIp = ips[0]?.trim();
    if (firstIp) return firstIp;
  }

  // X-Real-IP 头
  const realIp = c.req.header('x-real-ip');
  if (realIp?.trim()) return realIp.trim();

  // Hono 原生 remote address（Node.js 环境）
  try {
    const remoteAddr = c.env?.incoming?.socket?.remoteAddress;
    if (remoteAddr) return remoteAddr as string;
  } catch {
    // 忽略错误（某些环境可能没有 socket）
  }

  // Cloudflare Workers
  const cfIp = c.req.header('cf-connecting-ip');
  if (cfIp) return cfIp;

  // 最后的兜底
  return 'unknown';
}

/**
 * 生成限流键
 * 格式：`{tier}:{identifier}` 或 `{identifier}`
 * 其中 identifier 默认为客户端 IP（可被 keyGenerator 覆盖）
 */
function generateKey(c: Context, tier: RateLimitTier, identifier: string): string {
  // 对认证用户使用 userId 作为限流键，对未认证者使用 IP
  const userId = c.get('userId');
  const userKey = userId ? `user:${userId}` : `ip:${identifier}`;
  return `ratelimit:${tier.toLowerCase()}:${userKey}`;
}

// ============================================================
// 中间件工厂
// ============================================================

/**
 * 创建速率限制中间件
 *
 * @param options - 可选的限流配置（档位、自定义最大值/窗口、自定义键生成器）
 * @returns Hono 中间件处理函数
 *
 * @example
 * ```ts
 * // 使用预定义档位
 * app.use('/api/v1/agents', rateLimiter({ tier: 'AUTH' }));
 *
 * // 自定义严格限制
 * app.post('/api/v1/agents', rateLimiter({ max: 10, windowMs: 60000 }));
 *
 * // 按用户 ID 限流
 * app.use('/api/v1/*', rateLimiter({
 *   tier: 'GLOBAL',
 *   keyGenerator: (c) => c.get('userId') || 'anon',
 * }));
 * ```
 */
export function rateLimiter(options: RateLimitOptions = {}): MiddlewareHandler {
  const { tier = 'GLOBAL', max, windowMs, keyGenerator } = options;
  const config = DEFAULT_TIERS[tier];
  const effectiveMax = max ?? config.max;
  const effectiveWindow = windowMs ?? config.windowMs;

  return async (c: Context, next: Next) => {
    // 如果禁用则直接放行
    if (!ENABLED) {
      return next();
    }

    const identifier = keyGenerator ? keyGenerator(c) : getClientIP(c);
    const key = generateKey(c, tier, identifier);
    const now = Date.now();

    // 获取窗口内的时间戳
    const timestamps = await activeStore.getTimestamps(key);

    // 过滤窗口外的时间戳
    const windowStart = now - effectiveWindow;
    const withinWindow = timestamps.filter((t) => t > windowStart);

    // 检查是否超过限制
    if (withinWindow.length >= effectiveMax) {
      // 计算重试时间：最早的时间戳 + 窗口 + 1ms
      const oldestInWindow = withinWindow[0]!;
      const retryAfter = Math.ceil((oldestInWindow + effectiveWindow - now) / 1000);

      // 设置限流响应头
      c.header('X-RateLimit-Limit', String(effectiveMax));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(Math.ceil((oldestInWindow + effectiveWindow) / 1000)));
      c.header('Retry-After', String(retryAfter));

      throw new HTTPException(429, {
        message: `Too many requests. Please retry after ${retryAfter} seconds.`,
      });
    }

    // 记录本次请求
    await activeStore.recordHit(key, now);

    // 设置速率限制响应头
    const remaining = effectiveMax - withinWindow.length - 1;
    c.header('X-RateLimit-Limit', String(effectiveMax));
    c.header('X-RateLimit-Remaining', String(Math.max(0, remaining)));

    // 找到最早的窗口内时间戳，计算重置时间
    const oldestInWindow = withinWindow[0] ?? now;
    c.header('X-RateLimit-Reset', String(Math.ceil((oldestInWindow + effectiveWindow) / 1000)));

    return next();
  };
}

// ============================================================
// 便捷导出：端点分组预设
// ============================================================

/**
 * 为每个路由预设合适的限流档位
 *
 * 原则：
 * - 读操作 → GLOBAL / AUTH（宽松）
 * - 写操作（Create/Delete）→ STRICT（严格）
 * - 批量操作 → STRICT
 * - 文件上传 → STRICT
 * - 搜索 → AUTH
 */

/** 通用读取端点限流 */
export const readLimiter = rateLimiter({ tier: 'AUTH' });

/** 写入/修改端点限流 */
export const writeLimiter = rateLimiter({ tier: 'STRICT' });

/** 创建/删除端点限流（最严格） */
export const strictLimiter = rateLimiter({
  tier: 'STRICT',
  max: Math.floor(DEFAULT_TIERS.STRICT.max / 3), // 创建/删除更严格：10 req/min
});

/** 全局兜底限流 */
export const globalLimiter = rateLimiter({ tier: 'GLOBAL' });

// ============================================================
// 默认导出：全局中间件
// ============================================================

/**
 * 默认速率限制中间件（GLOBAL 档）
 * 应用于所有 /api/v1/* 路由
 */
const defaultRateLimiter = globalLimiter;
export default defaultRateLimiter;
