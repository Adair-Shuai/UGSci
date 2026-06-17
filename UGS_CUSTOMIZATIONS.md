# UGSci 定制改动登记表

> 本文件记录所有对 LobeHub 上游代码的定制改动，用于上游同步时识别冲突点。
> 规则见 [UPSTREAM_SYNC.md](./UPSTREAM_SYNC.md) 第 7 节「定制隔离规范」。

## 登记规范

每条改动记录以下字段：

| 字段 | 说明 |
|---|---|
| ID | `UGS-XXX` 递增编号 |
| 日期 | YYYY-MM-DD |
| 类型 | `new-file`（新增文件）/ `modify`（修改上游文件）/ `config`（配置变更） |
| 文件 | 改动涉及的文件路径（相对项目根） |
| 描述 | 改了什么、为什么改 |
| 标记 | 修改上游文件须在代码内打 `// UGS-MODIFY: UGS-XXX <说明>` 标记 |
| 冲突风险 | 低/中/高（该文件上游改动频率） |

---

## 改动记录

<!-- 最新改动放最上面 -->

| ID | 日期 | 类型 | 文件 | 描述 | 冲突风险 |
|---|---|---|---|---|---|
| UGS-000 | 2026-06-17 | new-file | `ARCHITECTURE.md` | 系统架构说明文档（二次开发导航） | 无（新文件） |
| UGS-001 | 2026-06-17 | new-file | `UPSTREAM_SYNC.md` | 上游同步策略文档 | 无（新文件） |
| UGS-002 | 2026-06-17 | config | `.gitignore` | 追加 UGSci local 段，忽略本地 AI 工具配置目录 | 低 |
| UGS-003 | 2026-06-17 | config | `.env` | 本地开发环境配置（PostgreSQL 连接、密钥）。不提交 git | 无 |
| UGS-004 | 2026-06-17 | new-file | `UGS_CUSTOMIZATIONS.md` | 本登记表 | 无 |
| UGS-005 | 2026-06-17 | modify+new | `src/libs/better-auth/define-config.ts`, `auth-client.ts`, `src/features/Auth/SignIn/*` | 手机号验证码登录（phoneNumber 插件+前端UI+模式切换） | 中 |
| UGS-006 | 2026-06-17 | modify | `vite.config.ts` | vite dev 中间件：auth 路由（/signin, /signup 等）返回 index.auth.html 而非 index.html，解决 dev 模式下 auth 页面 404 | 低 |

## 临时 Workaround（不提交 git，仅记录）

| 日期 | 问题 | 处理方式 |
|---|---|---|
| 2026-06-17 | pgvector 扩展未装（无 MSVC 编译） | 临时修改 0005/0006/0037/0070 迁移文件，vector(1024)→text、hnsw→btree，跑完迁移后 git checkout 恢复。后续需装 pgvector |
| 2026-06-17 | pg_search 扩展未装（ParadeDB） | 临时注释 0090/0093 迁移文件，跑完迁移后 git checkout 恢复。后续需装 pg_search 或改用 pg_trgm |

## UGS-005 详情：手机号登录

**改动的文件：**

| 文件 | 类型 | 说明 |
|---|---|---|
| `src/libs/better-auth/define-config.ts` | modify | 加 phoneNumber 插件（sendOTP dev 模式 console.log，signUpOnVerification 允许注册）；phoneNumber→phone 字段映射 |
| `src/libs/better-auth/auth-client.ts` | modify | 加 phoneNumberClient 插件，导出 phoneNumber 方法 |
| `src/features/Auth/SignIn/SignInPhoneStep.tsx` | new-file | 手机号+验证码登录界面组件 |
| `src/features/Auth/SignIn/index.tsx` | modify | 加 mode 切换，默认手机号登录 |
| `src/features/Auth/SignIn/useSignIn.ts` | modify | 加手机号 OTP 发送/验证逻辑、倒计时、模式切换 |

**后端验证：** `POST /api/auth/phone-number/send-otp` 返回 `{"message":"code sent"}`，OTP 验证码打印到 Next.js 控制台。

**待办：** 生产环境需在 `sendOTP` 里对接 SMS 服务商（Twilio / 阿里云短信 / 腾讯云短信）。

## UGS-006 详情：vite dev auth 路由分流

**问题：** LobeHub 有两个 SPA 入口——`index.html`（主应用，`entry.web.tsx` → `desktopRoutes`）和 `index.auth.html`（auth 页面，`entry.auth.tsx` → `authRoutes`）。生产环境 Next.js 按路径自动分流，但 vite dev 模式下只有一个 dev server，默认所有路由返回 `index.html`，导致 `/signin` 等路由在客户端找不到匹配 → 404。

**修复：** 在 `vite.config.ts` 添加 `ugs-auth-html-router` 中间件插件，拦截 auth 路由（`/signin`, `/signup`, `/verify-email`, `/reset-password`, `/auth-error`, `/market-auth-callback`, `/oauth/*`），返回 `index.auth.html` 的内容（经 `transformIndexHtml` 注入 HMR client）。API/trpc/oidc/webapi 和静态资源请求不受影响。
