/**
 * REST API HTTP 层测试 — 速率限制
 *
 * 验证 OWASP API4:2023（资源消耗无限制 → 速率限制）
 * - 超过阈值返回 429
 * - Retry-After 头部正确
 * - X-RateLimit-* 头部正确
 * - 不同档位限制正确
 * - 不同用户/IP 独立计算
 */

import { beforeAll,describe, expect, it } from 'vitest';

import { createTestApp, TEST_USER_ID, testToken } from './test-app';

describe('REST API HTTP — Rate Limiting', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    // 速率限制启用（默认）
    app = await createTestApp({ enableRateLimit: true });
  });

  describe('Rate Limit Headers', () => {
    it('should include X-RateLimit-Limit header', async () => {
      const res = await app.request('/api/v1/agents', {
        headers: { Authorization: testToken(TEST_USER_ID) },
      });
      expect(res.headers.get('x-ratelimit-limit')).toBeDefined();
    });

    it('should include X-RateLimit-Remaining header', async () => {
      const res = await app.request('/api/v1/agents', {
        headers: { Authorization: testToken(TEST_USER_ID) },
      });
      const remaining = res.headers.get('x-ratelimit-remaining');
      expect(remaining).toBeDefined();
      expect(parseInt(remaining!, 10)).toBeGreaterThanOrEqual(0);
    });

    it('should have X-RateLimit-Remaining decrease after requests', async () => {
      // 第一次请求
      const res1 = await app.request('/api/v1/agents', {
        headers: { Authorization: testToken(TEST_USER_ID) },
      });
      const remaining1 = parseInt(res1.headers.get('x-ratelimit-remaining') || '0', 10);

      // 第二次请求
      const res2 = await app.request('/api/v1/agents', {
        headers: { Authorization: testToken(TEST_USER_ID) },
      });
      const remaining2 = parseInt(res2.headers.get('x-ratelimit-remaining') || '0', 10);

      // 剩余次数应该减少或已归零
      expect(remaining2).toBeLessThanOrEqual(remaining1);
    });
  });

  describe('Rate Limit Enforcement (429)', () => {
    it('should eventually return 429 when exceeding limit', async () => {
      // 用非常小的窗口测试 — 使用 strict 档位（30 req/min）
      // 并发发送超过 30 个请求
      const totalRequests = 35;
      const requests = Array.from({length: totalRequests})
        .fill(null)
        .map(() =>
          app.request('/api/v1/agents', {
            method: 'POST',
            headers: {
              Authorization: testToken(TEST_USER_ID),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: `Rate Limit Test Agent ${Date.now()}` }),
          }),
        );

      const responses = await Promise.all(requests);
      const statusCodes = responses.map((r) => r.status);

      // 至少有一些请求被限流（429）
      const rateLimited = statusCodes.filter((s) => s === 429);
      expect(
        rateLimited.length,
        `Expected >= 1 rate-limited requests, got ${rateLimited.length}. Status codes: ${statusCodes.slice(0, 10).join(', ')}...`,
      ).toBeGreaterThanOrEqual(1);
    });

    it('429 response should include Retry-After header', async () => {
      // 耗尽限额直到 429
      let got429 = false;
      for (let i = 0; i < 40; i++) {
        const res = await app.request('/api/v1/agents', {
          method: 'POST',
          headers: {
            Authorization: testToken(TEST_USER_ID),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: `Rate Test ${i}-${Date.now()}` }),
        });

        if (res.status === 429) {
          got429 = true;
          const retryAfter = res.headers.get('retry-after');
          expect(retryAfter).toBeDefined();
          expect(parseInt(retryAfter!, 10)).toBeGreaterThan(0);
          break;
        }
      }

      expect(got429).toBe(true);
    });

    it('429 response should have meaningful error JSON', async () => {
      // 耗尽限额
      let got429 = false;
      for (let i = 0; i < 40; i++) {
        const res = await app.request('/api/v1/agents', {
          method: 'POST',
          headers: {
            Authorization: testToken(TEST_USER_ID),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: `Error Test ${i}` }),
        });

        if (res.status === 429) {
          got429 = true;
          const body = await res.json();
          expect(body.error).toBeDefined();
          expect(body.message).toContain('Too many requests');
          break;
        }
      }
      expect(got429).toBe(true);
    });
  });

  describe('Per-User Rate Limiting', () => {
    it('should track different users independently', async () => {
      // 用户 A 打满限额
      const userARequests = Array.from({length: 32})
        .fill(null)
        .map(() =>
          app.request('/api/v1/agents', {
            method: 'POST',
            headers: {
              Authorization: testToken(TEST_USER_ID),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: `User A Agent ${Date.now()}` }),
          }),
        );
      await Promise.all(userARequests);

      // 用户 B 应该不受影响
      const resB = await app.request('/api/v1/agents', {
        headers: { Authorization: testToken('test-user-other-zzz') },
      });
      // 用户 B 不应该被限流（独立计数器）
      expect(resB.status).toBe(200);
      const remaining = parseInt(resB.headers.get('x-ratelimit-remaining') || '300', 10);
      expect(remaining).toBeGreaterThan(0);
    });
  });
});
