/**
 * Hono OpenAPI 测试 App 工厂
 *
 * 创建一个独立的 Hono app 实例用于 HTTP 层测试。
 * 认证中间件被替换为测试模式：通过 Bearer token 前缀注入 userId。
 *
 * 用法:
 * ```ts
 * import { createTestApp, TEST_USER_ID, testToken } from './test-app';
 *
 * const app = await createTestApp();
 * const res = await app.request('/api/v1/agents', {
 *   headers: { Authorization: testToken(TEST_USER_ID) },
 * });
 * ```
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// ============================================================
// 测试常量
// ============================================================

export const TEST_USER_ID = 'test-user-001';
export const TEST_USER_B_ID = 'test-user-002';
export const TEST_WORKSPACE_ID = 'test-workspace-001';

/** 生成测试用 Bearer token */
export function testToken(userId: string = TEST_USER_ID): string {
  return `Bearer test-${userId}`;
}

// ============================================================
// Rate Limiting Middleware（内联版本，不依赖 openapi 包）
// ============================================================

interface RateLimitConfig {
  max: number;
  windowMs: number;
}

const store = new Map<string, number[]>();

function rateLimitMiddleware(config: RateLimitConfig) {
  return async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization') || '';
    const userId = authHeader.startsWith('Bearer test-')
      ? authHeader.replace('Bearer test-', '')
      : 'anon';

    const key = `rate:${userId}`;
    const now = Date.now();
    const timestamps = store.get(key) || [];
    const windowStart = now - config.windowMs;
    const withinWindow = timestamps.filter((t) => t > windowStart);

    if (withinWindow.length >= config.max) {
      const retryAfter = Math.ceil((withinWindow[0]! + config.windowMs - now) / 1000);
      c.header('X-RateLimit-Limit', String(config.max));
      c.header('X-RateLimit-Remaining', '0');
      c.header('Retry-After', String(retryAfter));
      return c.json(
        { error: 'rate_limit_exceeded', message: `Too many requests. Retry after ${retryAfter}s.` },
        429,
      );
    }

    store.set(key, [...withinWindow, now]);
    c.header('X-RateLimit-Limit', String(config.max));
    c.header('X-RateLimit-Remaining', String(config.max - withinWindow.length - 1));

    await next();
  };
}

// ============================================================
// 预定义的限流配置
// ============================================================

const GLOBAL_RATE_LIMIT: RateLimitConfig = { max: 1000, windowMs: 60000 };
const AUTH_RATE_LIMIT: RateLimitConfig = { max: 300, windowMs: 60000 };
const STRICT_RATE_LIMIT: RateLimitConfig = { max: 30, windowMs: 60000 };

// ============================================================
// Test App 创建
// ============================================================

export interface TestAppOptions {
  enableRateLimit?: boolean;
  rateLimitConfig?: RateLimitConfig;
}

export async function createTestApp(options: TestAppOptions = {}): Promise<Hono> {
  const { enableRateLimit = true, rateLimitConfig = AUTH_RATE_LIMIT } = options;

  const app = new Hono().basePath('/api/v1');

  // Global middleware
  app.use('*', cors());
  app.use('*', logger());
  app.use('*', prettyJSON());

  // Test auth middleware
  app.use('*', async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer test-')) {
      c.set('userId', authHeader.replace('Bearer test-', ''));
    } else {
      c.set('userId', null);
    }
    await next();
  });

  // Rate limiting
  if (enableRateLimit) {
    app.use('*', rateLimitMiddleware(rateLimitConfig));
  }

  // ========== Health Endpoint ==========
  app.get('/health', (c) => {
    return c.json({ service: 'lobe-chat-api', status: 'ok', timestamp: new Date().toISOString() });
  });

  // ========== Agents endpoints (simulated) ==========
  app.get('/agents', (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ data: [] });
  });

  app.post('/agents', rateLimitMiddleware(STRICT_RATE_LIMIT), (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ id: 'agent-001', name: 'Test Agent' }, 201);
  });

  app.get('/agents/:id', (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    const id = c.req.param('id');
    return c.json({ id, name: 'Test Agent' });
  });

  app.patch('/agents/:id', (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ id: c.req.param('id'), name: 'Updated' });
  });

  app.delete('/agents/:id', rateLimitMiddleware(STRICT_RATE_LIMIT), (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ success: true });
  });

  // ========== Messages endpoint (simulated) ==========
  app.get('/messages', (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ data: [] });
  });

  app.post('/messages', (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ id: 'msg-001' }, 201);
  });

  // ========== Files endpoint (simulated) ==========
  app.get('/files', (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ data: [] });
  });

  // ========== Users endpoint (simulated) ==========
  app.get('/users', (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ data: [] });
  });

  // ========== Knowledge Bases endpoint (simulated) ==========
  app.get('/knowledge-bases', (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ data: [] });
  });

  // ========== Models endpoint (simulated) ==========
  app.get('/models', (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ data: [] });
  });

  // ========== Providers endpoint (simulated) ==========
  app.get('/providers', (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ data: [] });
  });

  // ========== Topics endpoint (simulated) ==========
  app.get('/topics', (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ data: [] });
  });

  // Error handler
  app.onError((error: Error, c) => {
    return c.json({ error: error.message }, 500);
  });

  return app;
}

export async function createTestAppWithoutRateLimit(): Promise<Hono> {
  return createTestApp({ enableRateLimit: false });
}
