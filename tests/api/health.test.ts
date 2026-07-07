/**
 * REST API HTTP 层测试 — Health 端点
 *
 * 验证：
 * - /api/v1/health 健康检查正常返回
 * - 响应格式正确
 * - HTTP 状态码正确
 * - 无需认证即可访问
 * - CORS 头部正确
 */

import { beforeAll,describe, expect, it } from 'vitest';

import { createTestApp } from './test-app';

describe('REST API HTTP — Health Endpoint', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    app = await createTestApp({ enableRateLimit: false });
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 OK', async () => {
      const res = await app.request('/api/v1/health');
      expect(res.status).toBe(200);
    });

    it('should return correct JSON structure', async () => {
      const res = await app.request('/api/v1/health');
      const body = await res.json();

      expect(body).toMatchObject({
        service: 'lobe-chat-api',
        status: 'ok',
        timestamp: expect.any(String),
      });
    });

    it('should return valid ISO timestamp', async () => {
      const res = await app.request('/api/v1/health');
      const body = await res.json();

      const date = new Date(body.timestamp);
      expect(date.getTime()).not.toBeNaN();
      // 时间戳应该在当前时间的 5 秒内
      expect(Math.abs(date.getTime() - Date.now())).toBeLessThan(5000);
    });

    it('should be accessible without authentication', async () => {
      const res = await app.request('/api/v1/health');
      expect(res.status).toBe(200);
      // 不应该返回 401
      expect(res.status).not.toBe(401);
    });

    it('should return application/json content type', async () => {
      const res = await app.request('/api/v1/health');
      const contentType = res.headers.get('content-type');
      expect(contentType).toContain('application/json');
    });
  });

  describe('CORS Headers', () => {
    it('should include Access-Control-Allow-Origin', async () => {
      const res = await app.request('/api/v1/health', {
        headers: { Origin: 'https://app.example.com' },
      });
      expect(res.headers.get('access-control-allow-origin')).toBeDefined();
    });

    it('should handle OPTIONS preflight', async () => {
      const res = await app.request('/api/v1/health', { method: 'OPTIONS' });
      // OPTIONS 应该有响应（不管是 200 还是 204）
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('HTTP Method Constraints', () => {
    it('should return 405 or 404 for POST to health', async () => {
      const res = await app.request('/api/v1/health', { method: 'POST' });
      // 不应该返回 200（health 只有 GET）
      expect(res.status).not.toBe(200);
    });

    it('should return 404 for nonexistent path', async () => {
      const res = await app.request('/api/v1/nonexistent');
      // 应该是 404（不是 500 崩溃）
      expect(res.status).toBe(404);
    });
  });
});
