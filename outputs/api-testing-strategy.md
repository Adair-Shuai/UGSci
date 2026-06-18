# UGSci（LobeHub）API 测试体系建设方案

> **文档版本**: v1.0  
> **编制**: API 测试专家  
> **日期**: 2026-06-18  
> **适用项目**: UGSci / LobeHub 全栈平台  

---

## 目录

1. [项目API架构总览](#1-项目api架构总览)
2. [现有测试基础设施评估](#2-现有测试基础设施评估)
3. [API测试分层策略](#3-api测试分层策略)
4. [第一层：TRPC Router 单元测试强化](#4-第一层trpc-router-单元测试强化)
5. [第二层：TRPC 集成测试补齐](#5-第二层trpc-集成测试补齐)
6. [第三层：REST API HTTP 层测试](#6-第三层rest-api-http-层测试)
7. [第四层：API 合约测试](#7-第四层api-合约测试)
8. [第五层：安全测试体系](#8-第五层安全测试体系)
9. [第六层：性能测试体系](#9-第六层性能测试体系)
10. [第七层：E2E API 流程测试](#10-第七层e2e-api-流程测试)
11. [CI/CD 质量门禁设计](#11-cicd-质量门禁设计)
12. [实施路线图](#12-实施路线图)
13. [附录：关键文件路径与快速参考](#13-附录关键文件路径与快速参考)

---

## 1. 项目API架构总览

### 1.1 双层API体系

```plaintext
┌─────────────────────────────────────────────────────────────┐
│                    UGSci API 架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │               TRPC (主要API层)                         │ │
│  │  /trpc/lambda/[trpc] — 80+ 子路由，核心业务逻辑        │ │
│  │  /trpc/async/[trpc]  — 后台异步任务                    │ │
│  │  /trpc/mobile/[trpc] — 移动端专用                      │ │
│  │  /trpc/tools/[trpc]  — 工具调用                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │               REST API (辅助层)                        │ │
│  │  /api/v1/*         — Hono OpenAPI (CRUD + 健康检查)    │ │
│  │  /webapi/*         — Next.js WebAPI (聊天/TTS/STT)     │ │
│  │  /api/agent/*      — Agent Hono App (任务编排Webhook)  │ │
│  │  /api/auth/*       — 认证相关                          │ │
│  │  /api/workflows/*  — 工作流入口                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心API域与端点数统计

| 域 | TRPC 端点数 | REST 端点数 | 关键度 |
|---|---|---|---|
| **Agent**（代理） | 28 lambda + 37 agentEval + 37 agentDocument | `/api/v1/agents` CRUD | 🔴 核心 |
| **Chat / Message**（聊天消息） | 32 message + 3 aiChat + 18 botMessage | `/api/v1/messages` | 🔴 核心 |
| **Session / Topic**（会话话题） | 13 session + 29 topic + 8 thread | `/api/v1/topics` | 🔴 核心 |
| **File**（文件） | 23 file + 2 async | `/api/v1/files` | 🟠 重要 |
| **Knowledge Base**（知识库） | 11 knowledgeBase + 2 knowledge | `/api/v1/knowledge-bases` | 🟠 重要 |
| **User / Memory**（用户记忆） | 24 user + 40 userMemory | `/api/v1/users` | 🟠 重要 |
| **Task**（任务编排） | 40 task + 3 taskTemplate | — | 🟠 重要 |
| **AI Infra**（模型/提供商） | 11 aiModel + 10 aiProvider | `/api/v1/models`, `/api/v1/providers` | 🟡 一般 |
| **Plugin / Skill**（插件技能） | 7 plugin + 15 agentSkills | — | 🟡 一般 |
| **Market / Share**（市场分享） | 多个 market/* + 1 share | — | 🟡 一般 |
| **Device**（设备） | 32 device + 15 connector | — | 🟡 一般 |
| **Business**（业务） | subscription, workspace, spend | — | 🟡 一般 |
| **Auth**（认证） | oauth, verify, pushToken | `/api/auth/*` | 🔴 核心 |

**总计：约 500+ TRPC 端点 + 15+ REST 端点 + 20+ WebAPI/Agent 路由**

### 1.3 认证体系（多层）

| 认证层 | 位置 | 方式 |
|---|---|---|
| TRPC Lambda 上下文 | `packages/trpc/src/lambda/context.ts` | API Key → OIDC JWT → Better Auth Session |
| TRPC 用户认证中间件 | `packages/trpc/src/middleware/userAuth.ts` | `ctx.userId` 校验 |
| TRPC RBAC 权限 | `packages/business-server/src/trpc-middlewares/rbacPermission.ts` | 基于角色 |
| Hono OpenAPI 认证 | `packages/openapi/src/middleware/auth.ts` | 用户 + 工作区 |
| WebAPI 认证 | `src/app/(backend)/middleware/auth/index.ts` | `checkAuth` 包装器 |
| Agent Hono 认证 | agent app 独立应用 | QStash签名 / Bearer密钥 / 服务令牌 |

### 1.4 输入验证

- **TRPC**: 每个 endpoint 使用 Zod schema（`.input(z.object({...}))`）
- **Hono REST**: `@hono/zod-validator` 的 `zValidator()` 
- **统一性**: 全项目统一使用 Zod，类型安全从定义层到运行时

---

## 2. 现有测试基础设施评估

### 2.1 已有优势

| 能力 | 现状 | 评分 |
|---|---|---|
| **测试框架** | Vitest 3.2.6 全覆盖（~350+ 测试文件） | ⭐⭐⭐⭐⭐ |
| **TRPC 单元测试** | `createCaller(ctx)` 模式直接调用 procedure | ⭐⭐⭐⭐ |
| **数据库集成测试** | 真实 PostgreSQL + `getTestDB()` + 测试种子数据 | ⭐⭐⭐⭐ |
| **TRPC 中间件测试** | 最小化 router 测试认证逻辑 | ⭐⭐⭐⭐ |
| **E2E 测试** | Playwright + Cucumber BDD | ⭐⭐⭐⭐ |
| **CI/CD** | GitHub Actions 分片并行 + Codecov 覆盖率 | ⭐⭐⭐⭐⭐ |
| **AI 自动补测试** | 每日 Claude 自动为低覆盖模块添加测试 | ⭐⭐⭐⭐⭐ |

### 2.2 关键缺口

| 缺口 | 影响 | 优先级 |
|---|---|---|
| **无 HTTP 层 REST API 测试** | OpenAPI `/api/v1/*` 端点的 HTTP 行为未直接验证 | 🔴 P0 |
| **无 MSW / 前端 API Mock** | 前端测试高度依赖 `vi.mock`，离真实场景远 | 🟠 P1 |
| **无 API 合约测试** | OpenAPI 规范与实现的一致性未验证 | 🟠 P1 |
| **无性能/负载测试** | 缺少 k6/artillery，无法验证 SLA | 🟠 P1 |
| **无 API 安全扫描** | OWASP API Top 10 未系统化检测 | 🟠 P1 |
| **无频率限制实现** | 代码库中未发现任何 rate limiting | 🔴 P0 |
| **TRPC client 端未直接测试** | `@trpc/client` / `@trpc/react-query` 无测试 | 🟡 P2 |
| **测试工厂函数缺乏** | 各测试各自 mock，重复代码多 | 🟡 P2 |
| **集成测试覆盖率不均** | 仅 12 个 integration 测试，集中在 aiAgent | 🟠 P1 |

---

## 3. API测试分层策略

### 3.1 测试金字塔（针对本项目优化）

```plaintext
                    ┌─────────┐
                    │  E2E    │  14 场景 (Playwright+Cucumber)
                    │  流程   │  关键用户旅程端到端验证
                   ┌┴─────────┴┐
                   │  性能测试  │  10 场景 (k6)
                   │  安全测试  │  20 场景 (ZAP/Custom)
                  ┌┴───────────┴┐
                  │  合约测试    │  15 端点 (OpenAPI验证)
                  │  REST HTTP  │  15 端点 (supertest)
                 ┌┴─────────────┴┐
                 │  TRPC 集成    │  50+ 端点 (真实DB + 认证)
                 │  TRPC 单元    │  200+ 端点 (createCaller)
                └┴───────────────┴┘
```

### 3.2 各层目标与覆盖指标

| 层 | 目标覆盖率 | SLA | 执行时间 |
|---|---|---|---|
| TRPC 单元测试 | 95% procedure | 100% pass | < 30s |
| TRPC 集成测试 | 60% 关键端点 | 100% pass | < 2min |
| REST HTTP 测试 | 100% REST 端点 | 100% pass | < 30s |
| 合约测试 | 100% OpenAPI 端点 | 0 契约违约 | < 30s |
| 安全测试 | OWASP Top 10 | 0 严重/高危 | < 5min |
| 性能测试 | 10 关键端点 | 95%ile < 200ms | < 10min |
| E2E 测试 | 14 核心流程 | 100% pass | < 15min |

---

## 4. 第一层：TRPC Router 单元测试强化

### 4.1 现有模式评估

项目已有的 TRPC 测试模式非常高效：

```typescript
// ✅ 现有模式 — 直接通过 createCaller 调用 procedure，无需 HTTP 层
import { createCallerFactory } from '@/libs/trpc/lambda';

const ctx = await createContextInner({ userId: 'test-user' });
const caller = createCallerFactory(agentRouter)(ctx);
const result = await caller.getAgentConfig({ sessionId: 'xxx' });
```

**优势**：零网络开销、类型安全、直接模拟认证上下文  
**劣势**：不验证 HTTP 序列化/反序列化、不测试实际路由匹配

### 4.2 需要补齐的测试

当前 80+ 路由器中仅 44 个有测试文件（~55%），且覆盖率不均。重点补齐以下域：

| 优先级 | 路由域 | 当前状态 | 需新增端点测试数 |
|---|---|---|---|
| P0 | `task.ts` (40 endpoints) | 有 integration 测试 | +20 单元测试 |
| P0 | `userMemory.ts` / `userMemories.ts` (40 endpoints) | 有 1 个测试 | +20 单元测试 |
| P0 | `agentBotProvider.ts` (15 endpoints) | 无测试 | +15 单元测试 |
| P1 | `agentSignal.ts` (3) | 无测试 | +3 单元测试 |
| P1 | `agentNotify.ts` (1) | 无测试 | +1 单元测试 |
| P1 | `device.ts` (32) | 部分测试 | +16 单元测试 |
| P1 | `document.ts` (19) | 无测试 | +10 单元测试 |
| P1 | `notebook.ts` (5) | 无测试 | +5 单元测试 |
| P2 | `notification.ts` (6) | 无测试 | +6 单元测试 |
| P2 | `composio.ts` (7) | 无测试 | +7 单元测试 |

### 4.3 标准化测试工厂

建议创建统一的测试辅助模块，避免各测试重复 mock：

```typescript
// packages/trpc/src/testing/factories.ts

import { createContextInner, type AuthContext } from '@/libs/trpc/lambda/context';
import { getTestDB } from '@/database/testing/test-db';

/**
 * 创建带认证的测试上下文
 */
export async function createAuthContext(overrides?: Partial<AuthContext>): Promise<AuthContext> {
  return createContextInner({
    userId: 'test-user-001',
    workspaceId: 'test-workspace-001',
    ...overrides,
  });
}

/**
 * 创建未认证的测试上下文
 */
export async function createUnauthContext(): Promise<AuthContext> {
  return createContextInner({ userId: null });
}

/**
 * 创建带数据库的集成测试上下文
 */
export async function createIntegrationContext(overrides?: Partial<AuthContext>) {
  const db = await getTestDB();
  const ctx = await createAuthContext(overrides);
  return { db, ctx };
}

/**
 * Zod 输入验证测试模板
 */
export function testZodValidation<T>(
  schema: Zod.ZodType<T>,
  validInput: T,
  invalidCases: Array<{ input: any; expectedErrors: string[] }>,
) {
  it('should accept valid input', () => {
    expect(() => schema.parse(validInput)).not.toThrow();
  });

  invalidCases.forEach(({ input, expectedErrors }) => {
    it(`should reject invalid input: ${JSON.stringify(input)}`, () => {
      const result = schema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expectedErrors.forEach(err => {
          expect(result.error.issues.some(i => i.message.includes(err))).toBe(true);
        });
      }
    });
  });
}
```

### 4.4 单元测试模板

```typescript
// apps/server/src/routers/lambda/__tests__/template.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCallerFactory } from '@/libs/trpc/lambda';
import { createAuthContext, createUnauthContext } from '@/libs/trpc/testing/factories';

// 被测试的 router
import { myRouter } from '../myRouter';

const createCaller = createCallerFactory(myRouter);

describe('myRouter', () => {
  // ========== 认证测试 ==========
  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const ctx = await createUnauthContext();
      const caller = createCaller(ctx);
      
      await expect(caller.myProtectedQuery({})).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('should allow authenticated requests', async () => {
      const ctx = await createAuthContext();
      const caller = createCaller(ctx);
      
      const result = await caller.myProtectedQuery({});
      expect(result).toBeDefined();
    });
  });

  // ========== 输入验证测试 ==========
  describe('Input Validation', () => {
    it('should reject empty required fields', async () => {
      const ctx = await createAuthContext();
      const caller = createCaller(ctx);
      
      await expect(caller.myMutation({ name: '' })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('should reject oversized input', async () => {
      const ctx = await createAuthContext();
      const caller = createCaller(ctx);
      
      await expect(
        caller.myMutation({ name: 'x'.repeat(10000) })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });
  });

  // ========== 业务逻辑测试 ==========
  describe('Business Logic', () => {
    it('should return correct data shape', async () => {
      const ctx = await createAuthContext();
      const caller = createCaller(ctx);
      
      const result = await caller.myQuery({ id: 'test-1' });
      expect(result).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        createdAt: expect.any(Date),
      });
    });
  });

  // ========== 错误处理测试 ==========
  describe('Error Handling', () => {
    it('should return NOT_FOUND for missing resources', async () => {
      const ctx = await createAuthContext();
      const caller = createCaller(ctx);
      
      await expect(caller.myQuery({ id: 'nonexistent' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });
});
```

---

## 5. 第二层：TRPC 集成测试补齐

### 5.1 现有集成测试分布

| 路由域 | 集成测试文件 | 覆盖场景 |
|---|---|---|
| message | 1 | 消息CRUD流程 |
| topic | 1 | 话题创建流程 |
| task | 1 | 任务执行流程 |
| agentDocument | 1 | 文档VFS操作 |
| agentEval | 2 | 评估运行流程 |
| agentSkills | 1 | 技能安装流程 |
| aiAgent | 8 | 代理执行/子代理/多轮工具 |

**总计 15 个集成测试，集中在 aiAgent 域，其余域严重不足。**

### 5.2 集成测试标准模式

```typescript
// apps/server/src/routers/lambda/__tests__/integration/template.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createCallerFactory } from '@/libs/trpc/lambda';
import { getTestDB } from '@/database/testing/test-db';
import { seedTestData } from '@/database/testing/seed';

const createCaller = createCallerFactory(myRouter);

describe('myRouter Integration', () => {
  let db: Awaited<ReturnType<typeof getTestDB>>;
  let caller: ReturnType<typeof createCaller>;
  let testUserId: string;

  beforeAll(async () => {
    db = await getTestDB();
    testUserId = await seedTestData.user(db, { name: 'Integration Test User' });
  });

  beforeEach(async () => {
    caller = createCaller({ userId: testUserId });
  });

  afterAll(async () => {
    // 清理测试数据
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('Complete CRUD Flow', () => {
    let resourceId: string;

    it('CREATE: should create resource', async () => {
      const result = await caller.create({ name: 'Test Resource' });
      expect(result.id).toBeDefined();
      resourceId = result.id;
    });

    it('READ: should read created resource', async () => {
      const result = await caller.getById({ id: resourceId });
      expect(result.name).toBe('Test Resource');
    });

    it('UPDATE: should update resource', async () => {
      await caller.update({ id: resourceId, name: 'Updated' });
      const result = await caller.getById({ id: resourceId });
      expect(result.name).toBe('Updated');
    });

    it('DELETE: should delete resource', async () => {
      await caller.remove({ id: resourceId });
      await expect(caller.getById({ id: resourceId })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent creates correctly', async () => {
      const results = await Promise.all(
        Array(5).fill(null).map((_, i) =>
          caller.create({ name: `Concurrent ${i}` })
        )
      );
      const ids = results.map(r => r.id);
      expect(new Set(ids).size).toBe(5); // 所有 ID 唯一
    });
  });

  describe('Authorization', () => {
    it('should prevent cross-user access', async () => {
      const otherCaller = createCaller({ userId: 'other-user' });
      const resource = await caller.create({ name: 'Mine' });
      
      await expect(
        otherCaller.getById({ id: resource.id })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });
});
```

### 5.3 需要新增的集成测试

| 优先级 | 目标域 | 测试场景 | 预估用例数 |
|---|---|---|---|
| P0 | agent CRUD + config | 创建→配置→删除 完整流程 | ~15 |
| P0 | file upload + knowledge | 文件上传→关联知识库→搜索 | ~10 |
| P0 | session + topic + message | 全链路消息流 | ~20 |
| P1 | user memory | 记忆提取→存储→召回 | ~10 |
| P1 | agent bot provider | 机器人配置流程 | ~8 |
| P1 | task lifecycle | 任务创建→调度→执行→完成 | ~12 |
| P2 | device + connector | 设备注册→连接器配置 | ~8 |
| P2 | market + share | 市场发布→分享 | ~6 |

---

## 6. 第三层：REST API HTTP 层测试

### 6.1 问题分析

当前项目 **完全没有 HTTP 层的 REST API 测试**。TRPC 测试虽然覆盖了 procedure 逻辑，但以下场景只有 HTTP 层能验证：

- 请求/响应的 JSON 序列化正确性
- HTTP 状态码正确性（201/400/401/403/404/500）
- CORS 头部正确性
- 认证中间件的 HTTP 行为
- 错误响应格式一致性
- 实际路由匹配

### 6.2 方案：Vitest + Hono Testing Helper

利用 Hono 内置的 `app.request()` 测试能力，无需引入 supertest 等额外依赖：

```typescript
// tests/api/openapi/agents.test.ts

import { describe, it, expect, beforeAll } from 'vitest';
import { testApp } from '@/libs/openapi/testing';

describe('OpenAPI /api/v1/agents', () => {
  let authToken: string;

  beforeAll(async () => {
    // 使用测试辅助获取认证 token
    authToken = await getTestAuthToken('test-user-001');
  });

  // ========== GET /api/v1/agents ==========
  describe('GET /api/v1/agents', () => {
    it('should return 401 without auth', async () => {
      const res = await testApp.request('/api/v1/agents');
      expect(res.status).toBe(401);
    });

    it('should return 200 with valid auth', async () => {
      const res = await testApp.request('/api/v1/agents', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body).toMatchObject({
        data: expect.any(Array),
      });
    });

    it('should support pagination', async () => {
      const res = await testApp.request('/api/v1/agents?page=1&pageSize=10', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body.data.length).toBeLessThanOrEqual(10);
    });

    it('should filter by query parameter', async () => {
      const res = await testApp.request('/api/v1/agents?search=test', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
    });
  });

  // ========== POST /api/v1/agents ==========
  describe('POST /api/v1/agents', () => {
    it('should return 400 for invalid input', async () => {
      const res = await testApp.request('/api/v1/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: '' }), // 空名称
      });
      expect(res.status).toBe(400);
      
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it('should return 201 for valid input', async () => {
      const res = await testApp.request('/api/v1/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Test Agent',
          description: 'Created in test',
        }),
      });
      expect(res.status).toBe(201);
    });
  });

  // ========== PATCH /api/v1/agents/:id ==========
  describe('PATCH /api/v1/agents/:id', () => {
    it('should return 404 for nonexistent agent', async () => {
      const res = await testApp.request('/api/v1/agents/nonexistent-id', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: 'Updated' }),
      });
      expect(res.status).toBe(404);
    });
  });

  // ========== CORS 测试 ==========
  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const res = await testApp.request('/api/v1/agents', {
        headers: {
          Origin: 'https://app.lobehub.com',
          Authorization: `Bearer ${authToken}`,
        },
      });
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });
  });
});
```

### 6.3 Hono 测试 App 工厂

```typescript
// packages/openapi/src/testing/index.ts

import { OpenAPIApp } from '../app';

/**
 * 创建用于测试的 OpenAPI app 实例
 * 注入测试专用的认证和数据库中间件
 */
export async function createTestOpenAPIApp() {
  const app = new OpenAPIApp();
  
  // 替换认证中间件为测试模式
  app.use('*', async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer test-')) {
      c.set('userId', authHeader.replace('Bearer test-', ''));
    }
    await next();
  });
  
  return app.build();
}

export const testApp = await createTestOpenAPIApp();
```

### 6.4 WebAPI 路由 HTTP 测试

```typescript
// tests/api/webapi/chat.test.ts

describe('WebAPI /webapi/chat/[provider]', () => {
  it('should return 401 without auth', async () => {
    const res = await fetch('http://localhost:3010/webapi/chat/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    expect(res.status).toBe(401);
  });

  it('should return SSE stream for valid request', async () => {
    // 验证 Server-Sent Events 流式响应
    const res = await fetch('http://localhost:3010/webapi/chat/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `lobe-auth=${authToken}`,
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
  });
});
```

---

## 7. 第四层：API 合约测试

### 7.1 目标

确保 OpenAPI 规范文档与实际实现一致，防止文档过时导致的集成问题。

### 7.2 OpenAPI 规范验证

```typescript
// tests/contract/openapi-spec.test.ts

import { describe, it, expect } from 'vitest';
import { testApp } from '@/libs/openapi/testing';
import OpenAPIParser from '@apidevtools/swagger-parser';

describe('OpenAPI Contract Validation', () => {
  let spec: any;

  beforeAll(async () => {
    // 从 app 导出 OpenAPI 规范
    const res = await testApp.request('/api/v1/openapi.json');
    spec = await res.json();
  });

  it('should have valid OpenAPI 3.1 spec', async () => {
    await expect(OpenAPIParser.validate(spec)).resolves.not.toThrow();
  });

  it('should document all endpoints', () => {
    const paths = Object.keys(spec.paths);
    expect(paths).toContain('/api/v1/agents');
    expect(paths).toContain('/api/v1/messages');
    expect(paths).toContain('/api/v1/sessions');
  });

  it('should define request schemas for POST/PATCH', () => {
    const postAgent = spec.paths['/api/v1/agents']?.post;
    expect(postAgent?.requestBody?.content?.['application/json']?.schema).toBeDefined();
  });

  it('should define response schemas for GET', () => {
    const getAgents = spec.paths['/api/v1/agents']?.get;
    expect(getAgents?.responses?.['200']?.content?.['application/json']?.schema).toBeDefined();
  });

  it('should document error responses', () => {
    const getAgents = spec.paths['/api/v1/agents']?.get;
    expect(getAgents?.responses?.['401']).toBeDefined();
    expect(getAgents?.responses?.['403']).toBeDefined();
  });
});
```

### 7.3 消费者驱动合约测试

```typescript
// tests/contract/consumer-contracts.test.ts

describe('Consumer Contract: Frontend → TRPC', () => {
  it('agent.getAgentConfig response shape', async () => {
    const caller = createAgentCaller(await createAuthContext());
    const result = await caller.getAgentConfig({ sessionId: 'test-session' });
    
    // 前端依赖的字段必须存在
    expect(result).toMatchObject({
      model: expect.any(String),
      provider: expect.any(String),
      systemRole: expect.any(String),
      params: expect.objectContaining({
        temperature: expect.any(Number),
        top_p: expect.any(Number),
      }),
    });
  });

  it('message.batchCreateMessages input shape', async () => {
    // 前端发送的消息格式必须满足 Zod schema
    const input = {
      id: 'msg-1',
      role: 'user' as const,
      content: 'Hello',
      sessionId: 'session-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      agentId: 'agent-1',
      clientId: 'client-1',
    };
    
    // 不应抛出 Zod 验证错误
    expect(() => messageSchema.parse(input)).not.toThrow();
  });
});
```

---

## 8. 第五层：安全测试体系

### 8.1 OWASP API Security Top 10 覆盖

| # | 风险 | 测试方法 | 当前状态 |
|---|---|---|---|
| API1:2023 | 对象级别授权失效 (BOLA) | 跨用户资源访问测试 | ❌ 未系统化 |
| API2:2023 | 认证失效 | JWT 篡改、Token 重放 | ⚠️ 有中间件测试 |
| API3:2023 | 对象属性级别授权失效 | 批量赋值攻击测试 | ❌ 未测试 |
| API4:2023 | 资源消耗无限制 | 无 rate limiting | 🔴 **严重缺失** |
| API5:2023 | 功能级别授权失效 | 角色越权测试 | ⚠️ RBAC 有中间件 |
| API6:2023 | 无限制访问敏感业务流程 | 自动化滥用测试 | ❌ 未测试 |
| API7:2023 | 服务端请求伪造 (SSRF) | URL 注入测试 | ⚠️ 有 ssrf-safe-fetch 包 |
| API8:2023 | 安全配置错误 | CORS 配置审查 | ❌ 未测试 |
| API9:2023 | 存量资产管理不当 | 旧端点检查 | ❌ 未测试 |
| API10:2023 | API 不安全使用 | 第三方 API 密钥泄露 | ❌ 未测试 |

### 8.2 安全测试用例模板

```typescript
// tests/security/bola.test.ts

describe('Security: Broken Object Level Authorization (BOLA)', () => {
  let userAToken: string;
  let userBToken: string;
  let userAResourceId: string;

  beforeAll(async () => {
    userAToken = await getTestAuthToken('user-a');
    userBToken = await getTestAuthToken('user-b');
    
    // User A 创建资源
    const res = await testApp.request('/api/v1/agents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({ name: 'A\'s Agent' }),
    });
    userAResourceId = (await res.json()).id;
  });

  it('BOLA-1: should prevent user B from accessing user A\'s resource', async () => {
    const res = await testApp.request(`/api/v1/agents/${userAResourceId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    expect(res.status).toBe(403); // 或 404（不暴露资源存在性）
  });

  it('BOLA-2: should prevent user B from modifying user A\'s resource', async () => {
    const res = await testApp.request(`/api/v1/agents/${userAResourceId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userBToken}` },
      body: JSON.stringify({ name: 'Hacked' }),
    });
    expect([403, 404]).toContain(res.status);
  });

  it('BOLA-3: should prevent user B from deleting user A\'s resource', async () => {
    const res = await testApp.request(`/api/v1/agents/${userAResourceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    expect([403, 404]).toContain(res.status);
  });
});
```

### 8.3 认证测试

```typescript
// tests/security/auth.test.ts

describe('Security: Authentication', () => {
  it('AUTH-1: should reject expired tokens', async () => {
    const expiredToken = await createExpiredTestToken();
    const res = await testApp.request('/api/v1/agents', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    expect(res.status).toBe(401);
  });

  it('AUTH-2: should reject tampered JWT', async () => {
    const tamperedToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ0ZXN0In0.';
    const res = await testApp.request('/api/v1/agents', {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });
    expect(res.status).toBe(401);
  });

  it('AUTH-3: should reject missing auth header', async () => {
    const res = await testApp.request('/api/v1/agents');
    expect(res.status).toBe(401);
  });
});
```

### 8.4 注入攻击测试

```typescript
// tests/security/injection.test.ts

describe('Security: Injection Attacks', () => {
  const injectionPayloads = [
    "'; DROP TABLE agents; --",
    "<script>alert('xss')</script>",
    "'; WAITFOR DELAY '00:00:05'; --",
    "${7*7}",
    "../../../etc/passwd",
  ];

  injectionPayloads.forEach((payload) => {
    it(`INJ: should sanitize input: ${payload.substring(0, 30)}...`, async () => {
      const res = await testApp.request('/api/v1/agents?search=' + encodeURIComponent(payload), {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      
      // 不应返回 500（服务器崩溃），应返回 200（空结果）或 400（拒绝）
      expect(res.status).not.toBe(500);
    });
  });
});
```

### 8.5 频率限制测试（需先实现 rate limiting）

```typescript
// tests/security/rate-limit.test.ts

describe('Security: Rate Limiting', () => {
  it('RATE-1: should enforce rate limiting after threshold', async () => {
    const requests = Array(100).fill(null).map(() =>
      testApp.request('/api/v1/agents', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  it('RATE-2: should include Retry-After header', async () => {
    // 先打满限额
    for (let i = 0; i < 100; i++) {
      await testApp.request('/api/v1/agents', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    }
    
    const res = await testApp.request('/api/v1/agents', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    if (res.status === 429) {
      expect(res.headers.get('Retry-After')).toBeDefined();
    }
  });
});
```

---

## 9. 第六层：性能测试体系

### 9.1 工具选型

建议引入 **k6**（Grafana k6），原因：
- 脚本语言为 JavaScript，与项目技术栈一致
- 自带丰富的指标（P95/P99、RPS、错误率）
- 支持 CI/CD 集成和阈值断言
- 比 artillery 更轻量，比 autocannon 更强大

### 9.2 性能测试场景设计

| 场景 | 端点 | 虚拟用户 | 持续时间 | 目标 |
|---|---|---|---|---|
| 基础负载 | `GET /api/v1/agents` | 50 VU | 2 min | P95 < 200ms |
| 峰值负载 | 混合端点 | 200 VU | 5 min | 错误率 < 0.1% |
| 压力测试 | 混合端点 | 500 VU | 3 min | 找到断点 |
| 持续负载 | 混合端点 | 100 VU | 30 min | 无内存泄漏 |
| 写操作负载 | `POST/PATCH` 端点 | 30 VU | 2 min | P95 < 500ms |

### 9.3 k6 测试脚本模板

```javascript
// tests/performance/k6/api-baseline.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const agentQueryTime = new Trend('agent_query_time');
const messagePostTime = new Trend('message_post_time');

// 测试配置
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // 预热
    { duration: '1m',  target: 50 },   // 爬升到正常负载
    { duration: '2m',  target: 50 },   // 保持正常负载
    { duration: '30s', target: 0 },    // 冷却
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200', 'p(99)<500'],  // 95%ile < 200ms
    'errors': ['rate<0.001'],                            // 错误率 < 0.1%
    'http_req_failed': ['rate<0.01'],                   // 失败率 < 1%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3010';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// 默认请求头
const params = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  },
};

export default function () {
  // ===== 场景1: Agent 列表查询 =====
  group('Agent List Query', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/v1/agents?page=1&pageSize=20`, params);
    agentQueryTime.add(Date.now() - start);
    
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response has data array': (r) => {
        try { return Array.isArray(JSON.parse(r.body).data); } catch { return false; }
      },
    }) || errorRate.add(true);
  });

  // ===== 场景2: Agent 详情查询 =====
  group('Agent Detail Query', () => {
    const res = http.get(`${BASE_URL}/api/v1/agents/test-agent-id`, params);
    
    check(res, {
      'status is 200 or 404': (r) => [200, 404].includes(r.status),
    }) || errorRate.add(true);
  });

  // ===== 场景3: 消息发送 =====
  group('Message Create', () => {
    const payload = JSON.stringify({
      content: `Performance test message ${Date.now()}`,
      role: 'user',
      sessionId: 'test-session-id',
    });
    
    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/v1/messages`, payload, params);
    messagePostTime.add(Date.now() - start);
    
    check(res, {
      'POST status is 201 or 200': (r) => [200, 201].includes(r.status),
    }) || errorRate.add(true);
  });

  // 模拟真实用户思考时间
  sleep(Math.random() * 2 + 1); // 1-3 秒
}

// 测试结束时输出汇总
export function handleSummary(data) {
  return {
    'tests/performance/results/baseline-summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}
```

### 9.4 TRPC 性能测试

```javascript
// tests/performance/k6/trpc-agent.js

import http from 'k6/http';
import { check } from 'k6';

// TRPC 调用方式：POST JSON-RPC 风格
const TRPC_URL = `${__ENV.API_BASE_URL || 'http://localhost:3010'}/trpc/lambda/agent.getAgentConfig`;

export default function () {
  const payload = JSON.stringify({
    sessionId: 'test-session',
  });

  const res = http.post(TRPC_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`,
    },
  });

  check(res, {
    'TRPC status 200': (r) => r.status === 200,
    'TRPC response has result': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result?.data !== undefined;
      } catch { return false; }
    },
  });
}
```

### 9.5 数据库查询性能测试

性能瓶颈常在数据库层。建议对关键查询路径做独立测试：

```typescript
// tests/performance/db-query.test.ts

import { describe, it, expect } from 'vitest';
import { getTestDB } from '@/database/testing/test-db';
import { AgentModel } from '@/database/models/agent';

describe('Database Query Performance', () => {
  let db: Awaited<ReturnType<typeof getTestDB>>;

  beforeAll(async () => {
    db = await getTestDB();
  });

  it('PERF-DB-1: agent query by ID < 10ms', async () => {
    const agentModel = new AgentModel(db, 'test-user');
    
    const start = performance.now();
    await agentModel.findById('test-agent-id');
    const elapsed = performance.now() - start;
    
    expect(elapsed).toBeLessThan(10); // 主键查询 < 10ms
  });

  it('PERF-DB-2: agent list with pagination < 50ms', async () => {
    const agentModel = new AgentModel(db, 'test-user');
    
    const start = performance.now();
    await agentModel.queryByUserId({ page: 1, pageSize: 50 });
    const elapsed = performance.now() - start;
    
    expect(elapsed).toBeLessThan(50);
  });
});
```

---

## 10. 第七层：E2E API 流程测试

### 10.1 现有 E2E 状态

项目已有 14 个 Cucumber Feature 文件，使用 Playwright 执行。但主要是 UI 流程测试，需要补充 API 驱动的新型场景：

### 10.2 API 驱动 E2E 场景

```gherkin
# e2e/src/features/api/agent-crud.feature

Feature: Agent CRUD via API
  As an authenticated user
  I want to manage agents via REST API
  So that third-party integrations work correctly

  Background:
    Given I have a valid API token
    And the server is running

  Scenario: Complete agent lifecycle
    When I create an agent with name "E2E Test Agent"
    Then the response status should be 201
    And the response should contain an agent ID
    
    When I fetch the agent by ID
    Then the status should be 200
    And the agent name should be "E2E Test Agent"
    
    When I update the agent name to "Updated Agent"
    Then the status should be 200
    
    When I fetch the agent again
    Then the name should be "Updated Agent"
    
    When I delete the agent
    Then the status should be 200
    
    When I try to fetch the deleted agent
    Then the status should be 404

  Scenario: Authorization - cannot access other user's agents
    Given I am authenticated as "user-a"
    And "user-b" has created an agent
    
    When I try to access "user-b"'s agent
    Then the status should be 403

  Scenario: Input validation
    When I create an agent with empty name
    Then the status should be 400
    And the error should mention "name"
```

```typescript
// e2e/src/steps/api/agent.steps.ts

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { APIRequestContext } from '@playwright/test';

let apiContext: APIRequestContext;
let lastResponse: any;
let createdAgentId: string;

Given('I have a valid API token', async function () {
  apiContext = this.parameters.apiContext;
});

When('I create an agent with name {string}', async function (name: string) {
  lastResponse = await apiContext.post('/api/v1/agents', {
    data: { name, description: 'E2E test' },
  });
  const body = await lastResponse.json();
  createdAgentId = body.id;
});

Then('the response status should be {int}', function (status: number) {
  expect(lastResponse.status()).toBe(status);
});

When('I fetch the agent by ID', async function () {
  lastResponse = await apiContext.get(`/api/v1/agents/${createdAgentId}`);
});
```

---

## 11. CI/CD 质量门禁设计

### 11.1 现有 CI 流程分析

```plaintext
当前 CI 流程（test.yml）:
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│ test-packages│    │  test-app    │    │ test-database│
│ (26 packages)│    │ (2 shards)   │    │ (PostgreSQL) │
└─────────────┘    └──────────────┘    └──────────────┘
         │                │                   │
         └────────────────┼───────────────────┘
                          ↓
                   Codecov 覆盖率上报
```

### 11.2 增强后的 CI 质量门禁

```yaml
# .github/workflows/api-quality-gate.yml (新增)

name: API Quality Gate

on:
  pull_request:
    paths:
      - 'apps/server/**'
      - 'packages/trpc/**'
      - 'packages/openapi/**'
      - 'packages/database/**'

jobs:
  # ===== 门禁1: TRPC Router 单元测试 =====
  api-unit-tests:
    runs-on: ubuntu-latest
    name: API Unit Tests (TRPC Routers)
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-env
      - run: pnpm install
      - run: bunx vitest --dir apps/server --reporter=verbose
        env:
          CI: true
      - name: Check coverage threshold
        run: |
          COVERAGE=$(bunx vitest run --dir apps/server --coverage --reporter=json 2>/dev/null | jq '.coverage')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "❌ TRPC router coverage ($COVERAGE%) below 80% threshold"
            exit 1
          fi

  # ===== 门禁2: REST API HTTP 测试 =====
  api-http-tests:
    runs-on: ubuntu-latest
    name: REST API HTTP Tests
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-env
      - run: pnpm install
      - run: bunx vitest --dir tests/api --reporter=verbose
        env:
          CI: true
          DATABASE_TEST_URL: postgresql://postgres:postgres@localhost:5432/postgres

  # ===== 门禁3: API 合约测试 =====
  api-contract-tests:
    runs-on: ubuntu-latest
    name: API Contract Tests
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-env
      - run: pnpm install
      - run: bunx vitest --dir tests/contract --reporter=verbose

  # ===== 门禁4: API 安全扫描 =====
  api-security-scan:
    runs-on: ubuntu-latest
    name: API Security Scan
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-env
      - run: pnpm install
      - run: bunx vitest --dir tests/security --reporter=verbose
      # 可选: 集成 OWASP ZAP 主动扫描
      # - uses: zaproxy/action-full-scan@v0.12.0

  # ===== 门禁5: API 性能基线 =====
  api-performance:
    runs-on: ubuntu-latest
    name: API Performance Baseline
    needs: [api-unit-tests, api-http-tests]  # 功能测试通过后才跑性能
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-env
      - run: pnpm install
      - name: Start server
        run: |
          pnpm run dev:server &
          sleep 10
          curl --retry 5 --retry-delay 2 http://localhost:3010/api/v1/health
      - name: Run k6 baseline
        uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/performance/k6/api-baseline.js
          flags: --out json=tests/performance/results/baseline.json
      - name: Check performance thresholds
        run: |
          P95=$(jq '.metrics.http_req_duration.p95' tests/performance/results/baseline.json)
          if (( $(echo "$P95 > 200" | bc -l) )); then
            echo "❌ P95 response time ($P95 ms) exceeds 200ms threshold"
            exit 1
          fi
          echo "✅ P95 response time: $P95 ms"

  # ===== 综合质量报告 =====
  api-quality-report:
    needs: [api-unit-tests, api-http-tests, api-contract-tests, api-security-scan, api-performance]
    if: always()
    runs-on: ubuntu-latest
    name: API Quality Report
    steps:
      - name: Generate report
        run: |
          echo "# API Quality Gate Report" >> $GITHUB_STEP_SUMMARY
          echo "| Gate | Status |" >> $GITHUB_STEP_SUMMARY
          echo "|------|--------|" >> $GITHUB_STEP_SUMMARY
          echo "| Unit Tests | ${{ needs.api-unit-tests.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| HTTP Tests | ${{ needs.api-http-tests.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Contract Tests | ${{ needs.api-contract-tests.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Security Scan | ${{ needs.api-security-scan.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Performance | ${{ needs.api-performance.result }} |" >> $GITHUB_STEP_SUMMARY
```

### 11.3 质量门禁决策矩阵

```plaintext
所有PR合并前必须通过：

┌─────────────────────────────────────────────────────────┐
│                    质量门禁决策矩阵                        │
├─────────────────┬──────────┬──────────┬─────────────────┤
│ 门禁            │ 阻塞PR？  │ 警告？   │ 条件             │
├─────────────────┼──────────┼──────────┼─────────────────┤
│ 单元测试通过    │ ✅ 是    │ —        │ 100% pass       │
│ 覆盖率 ≥ 80%   │ ✅ 是    │ —        │ 新增代码≥85%    │
│ HTTP测试通过    │ ✅ 是    │ —        │ 100% pass       │
│ 合约测试通过    │ ✅ 是    │ —        │ 0 contract violation│
│ 安全扫描        │ ✅ 是    │ —        │ 0 严重/高危     │
│ 性能P95 < 200ms│ ⚠️ 否    │ ✅ 是    │ 超过阈值发警告   │
│ 性能错误率<0.1%│ ✅ 是    │ —        │ 超过阈值阻塞     │
└─────────────────┴──────────┴──────────┴─────────────────┘
```

---

## 12. 实施路线图

### 阶段一：基础补齐（第1-3周）—— 立即可做

| 周 | 任务 | 产出 | 负责 |
|---|---|---|---|
| W1 | 创建 `packages/trpc/src/testing/factories.ts` 测试工厂 | 标准化测试上下文工厂 | 后端开发 |
| W1 | 补齐高频未测试TRPC路由（task, userMemory, agentBotProvider）| +50 单元测试 | 后端开发 |
| W1 | 编写测试模板和规范文档，纳入 AGENTS.md | 测试编写规范 | API 测试专家 |
| W2 | 创建 Hono 测试 App 工厂（`packages/openapi/src/testing/`）| 测试基础设施 | 后端开发 |
| W2 | 编写 REST API HTTP 层测试（15 端点） | +30 HTTP 测试 | 后端开发 |
| W2 | 集成测试补齐：agent-file-knowledge + session-topic-message | +30 集成测试 | 后端开发 |
| W3 | 编写安全测试核心用例（认证/授权/注入） | +25 安全测试 | API 测试专家 |
| W3 | 配置 CI 质量门禁（api-quality-gate.yml） | CI 流水线 | DevOps |

### 阶段二：体系完善（第4-6周）

| 周 | 任务 | 产出 |
|---|---|---|
| W4 | 引入 k6，编写性能基线脚本 | 5个性能测试场景 |
| W4 | 配置性能 CI 门禁 | k6 + GitHub Actions |
| W5 | 编写 API 合约测试（OpenAPI 验证 + 消费者契约） | 15 合约测试 |
| W5 | 补齐集成测试（device, task lifecycle, market） | +25 集成测试 |
| W6 | 实现频率限制中间件 + 测试 | Rate limiting + 5 测试 |
| W6 | E2E API 流程补齐 | 5 个 API E2E 场景 |

### 阶段三：持续运营（第7周起）

| 周期 | 任务 |
|---|---|
| 每周 | 新增端点要求同步编写测试（TDD：先写测试再写实现） |
| 每两周 | 性能回归测试，对比基线 |
| 每月 | 安全扫描更新（新漏洞规则） |
| 每季度 | 合约测试审查（API 变更时） |

### 12.1 各阶段测试覆盖目标

```plaintext
         当前        阶段一     阶段二     阶段三（稳态）
         ────       ──────    ──────    ────────────
TRPC单元  55%  →    75%   →   85%   →    95%
TRPC集成  15%  →    30%   →   50%   →    60%
REST HTTP  0%  →   80%   →  100%   →   100%
合约测试   0%  →    0%   →  100%   →   100%
安全测试   0%  →   40%   →   80%   →   100% (OWASP)
性能测试   0%  →    0%   →  100%   →   100% (回归)
```

---

## 13. 附录：关键文件路径与快速参考

### 13.1 关键路径速查

| 用途 | 路径 |
|---|---|
| TRPC Lambda 路由入口 | `apps/server/src/routers/lambda/index.ts` |
| TRPC Context 工厂 | `packages/trpc/src/lambda/context.ts` |
| TRPC Mock Caller | `packages/trpc/src/mock.ts` |
| TRPC 认证中间件 | `packages/trpc/src/middleware/userAuth.ts` |
| OpenAPI App 定义 | `packages/openapi/src/app.ts` |
| OpenAPI 认证中间件 | `packages/openapi/src/middleware/auth.ts` |
| Hono REST 路由入口 | `src/app/(backend)/api/v1/[[...route]]/route.ts` |
| WebAPI 路由 | `src/app/(backend)/webapi/` |
| Agent Hono App | agent app (独立 Hono 应用) |
| Database Schema | `packages/database/src/schemas/` |
| Database Models | `packages/database/src/models/` |
| Test Setup | `tests/setup.ts` |
| CI Test Workflow | `.github/workflows/test.yml` |
| CI E2E Workflow | `.github/workflows/e2e.yml` |

### 13.2 测试快速命令

```bash
# 运行所有 TRPC router 测试
bunx vitest --dir apps/server

# 运行单个 router 测试
bunx vitest apps/server/src/routers/lambda/__tests__/agent.test.ts

# 运行 REST API HTTP 测试
bunx vitest --dir tests/api

# 运行安全测试
bunx vitest --dir tests/security

# 运行性能测试
k6 run tests/performance/k6/api-baseline.js

# 运行 E2E API 测试
cd e2e && npx cucumber-js --tags '@api'

# 类型检查（API 相关）
bun run type-check 2>&1 | grep -E "(trpc|openapi|router)"
```

### 13.3 数据库操作安全提醒（来自 LESSONS_LEARNED.md INC-001）

> ⚠️ **永远不要对 `agents` 表执行 DELETE！**
> 
> `agents` 表被 11+ 张表通过 `onDelete: 'cascade'` 外键引用。删除 agent 会连带删除所有对话历史和消息。
> 修改 agent 配置请使用 UPDATE。

### 13.4 新端点开发检查清单

- [ ] TRPC procedure 定义了 Zod input schema
- [ ] 编写了单元测试（`createCaller` 模式）覆盖：认证/输入验证/正常流程/错误处理
- [ ] 关键端点编写了集成测试（真实 DB）
- [ ] REST 端点编写了 HTTP 层测试
- [ ] 安全测试覆盖了 BOLA（对象级授权）
- [ ] 性能敏感端点添加了响应时间断言
- [ ] OpenAPI 规范已更新（如有）
- [ ] 测试通过：`bunx vitest --dir apps/server`

---

## 附录A：统计汇总

| 指标 | 当前值 | 目标值（阶段三） |
|---|---|---|
| TRPC 路由器总数 | 80+ | — |
| TRPC 端点数 | ~500 | — |
| REST 端点数 | ~20 | — |
| 测试文件数 | ~350 | ~500 |
| TRPC Router 测试覆盖率 | ~55% | 95% |
| REST HTTP 测试覆盖率 | 0% | 100% |
| 安全测试覆盖 (OWASP) | ~10% | 100% |
| 性能测试场景 | 0 | 10 |
| CI 质量门禁 | 3 | 7 |
| AI 自动补测试 | ✅ 已启用 | 维持 |

---

> **本方案基于对项目 API 架构的完整审查（80+ TRPC 路由器、双层认证体系、现有 350+ 测试文件）。建议从阶段一开始立即执行，优先补齐安全测试和频率限制这两个 P0 缺口。**
