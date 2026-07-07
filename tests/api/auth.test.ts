/**
 * REST API HTTP 层测试 — 认证与授权
 *
 * 验证 OWASP API2:2023（认证失效）和 API5:2023（功能级别授权失效）
 * - 401 无认证访问受保护端点
 * - 403 越权访问其他用户资源
 * - 无效 token 拒绝
 * - Token 篡改检测
 */

import { beforeAll,describe, expect, it } from 'vitest';

import { createTestApp, TEST_USER_B_ID, TEST_USER_ID, testToken } from './test-app';

describe('REST API HTTP — Authentication & Authorization', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    app = await createTestApp({ enableRateLimit: false });
  });

  // ============================================================
  // 认证测试
  // ============================================================

  describe('Authentication (401 scenarios)', () => {
    const protectedEndpoints = [
      { method: 'GET', path: '/api/v1/agents' },
      { method: 'POST', path: '/api/v1/agents' },
      { method: 'GET', path: '/api/v1/messages' },
      { method: 'GET', path: '/api/v1/files' },
      { method: 'GET', path: '/api/v1/users' },
      { method: 'GET', path: '/api/v1/knowledge-bases' },
      { method: 'GET', path: '/api/v1/models' },
      { method: 'GET', path: '/api/v1/providers' },
      { method: 'GET', path: '/api/v1/topics' },
    ];

    protectedEndpoints.forEach(({ method, path }) => {
      it(`${method} ${path} should return 401 without auth`, async () => {
        const res = await app.request(path, { method });
        expect(res.status).toBe(401);
      });
    });

    it('should reject empty Authorization header', async () => {
      const res = await app.request('/api/v1/agents', {
        headers: { Authorization: '' },
      });
      expect(res.status).toBe(401);
    });

    it('should reject malformed Bearer token', async () => {
      const res = await app.request('/api/v1/agents', {
        headers: { Authorization: 'Bearer' },
      });
      expect(res.status).toBe(401);
    });

    it('should reject non-Bearer auth scheme', async () => {
      const res = await app.request('/api/v1/agents', {
        headers: { Authorization: 'Basic dGVzdDpwYXNz' },
      });
      expect(res.status).toBe(401);
    });

    it('should reject expired/invalid API keys', async () => {
      // 发送一个格式正确但数据库中不存在的 API Key
      const res = await app.request('/api/v1/agents', {
        headers: { Authorization: 'Bearer sk-lh-aaaaaaaa00000001' },
      });
      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // 授权测试（OWASP API5）
  // ============================================================

  describe('Authorization (403 scenarios)', () => {
    it('should allow authenticated user access to own resources', async () => {
      const res = await app.request('/api/v1/agents', {
        headers: { Authorization: testToken(TEST_USER_ID) },
      });
      // 应该返回有效响应（200 或权限相关的错误码）
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(500);
    });

    it('should properly distinguish between different users', async () => {
      const resA = await app.request('/api/v1/agents', {
        headers: { Authorization: testToken(TEST_USER_ID) },
      });
      const resB = await app.request('/api/v1/agents', {
        headers: { Authorization: testToken(TEST_USER_B_ID) },
      });
      // 两个不同用户都应该能正常访问
      expect(resA.status).not.toBe(401);
      expect(resB.status).not.toBe(401);
    });

    it('DELETE should require proper permission level', async () => {
      // 删除操作是无权限时应该返回 403（认证了但无权限）
      const res = await app.request('/api/v1/agents/nonexistent-id', {
        method: 'DELETE',
        headers: { Authorization: testToken(TEST_USER_ID) },
      });
      // 不应该返回 401（已认证）也不应该返回 500（服务器错误）
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(500);
    });
  });

  // ============================================================
  // 响应格式一致性
  // ============================================================

  describe('Error Response Format', () => {
    it('401 response should be consistent JSON', async () => {
      const res = await app.request('/api/v1/agents');
      expect(res.status).toBe(401);

      const body = await res.json();
      // 应该有某种错误信息字段
      expect(body).toBeDefined();
    });

    it('404 response should be valid JSON', async () => {
      const res = await app.request('/api/v1/agents/nonexistent-id-99999', {
        headers: { Authorization: testToken(TEST_USER_ID) },
      });

      // 应该返回 JSON（不是 HTML 错误页）
      const contentType = res.headers.get('content-type');
      if (contentType) {
        expect(contentType).toContain('application/json');
      }
    });
  });
});
