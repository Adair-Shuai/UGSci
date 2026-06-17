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
| UGS-007 | 2026-06-17 | modify | `packages/database/src/schemas/user.ts`, `packages/database/src/models/user.ts`, `apps/server/src/services/user/index.ts`, `scripts/clerk-to-betterauth/index.ts` | drizzle 字段 phone→phoneNumber（DB 列名不变），让 better-auth phoneNumber 插件 schema 校验通过 | 中 |
| UGS-008 | 2026-06-17 | modify | `packages/business/const/src/branding.ts`, `index.html`, `src/app/manifest.ts`, `package.json`, `src/layout/GlobalProvider/AppTheme.tsx` | 品牌定制：LobeHub→UGSci 储气智脑，主题色 #121E30/#2563EB，文字 Logo | 低 |
| UGS-009 | 2026-06-17 | modify+new | `packages/builtin-agents/src/types.ts`, `index.ts`, `agents/ugs-*/` | 13 个储气库领域专家 agent（库容评估/产能评价/库容参数/注采运行/智能调峰/配产配注/BPINN/PVT/产量不稳定/测井解释/数值模拟/完整性评价/文献写作） | 低 |
| UGS-009b | 2026-06-17 | fix | `packages/builtin-agents/src/agents/ugs-capacity/systemRole.ts` | 修复嵌入 SY/T 7686 规范时遗留的重复闭合反引号（第136行多余 `` `; ``），导致 vite code-inspector 插件解析报 "Missing semicolon" 语法错误、首页白屏 | 无 |
| UGS-014 | 2026-06-17 | config | `.env` | FEATURE_FLAGS=-cloud_promotion,-workspace,+knowledge_base（2026-06-17 更新：恢复 market 社区功能，去掉 -market） | 无 |
| UGS-010 | 2026-06-17 | modify | `src/routes/(main)/home/_layout/Header/index.tsx`, `src/routes/(main)/home/_layout/Footer/index.tsx` | 将账户模块 `<User />` 从顶部 Header 移至底部 Footer，紧挨问号（帮助中心）图标左侧；Header 不再显示用户信息（回退为面包屑导航） | 低 |
| UGS-010b | 2026-06-17 | modify+new | `src/routes/(main)/home/_layout/Header/index.tsx`, `src/routes/(main)/home/_layout/Header/components/UGSciLogo.tsx` | 在 Header 左上角放置 UGSci 文字 Logo（"UG" 跟随文字色，"Sci" 用品牌主色 colorPrimary）；新建 UGSciLogo 组件 | 无 |
| UGS-010c | 2026-06-17 | modify | `src/features/User/UserPanel/index.tsx` | 移除 Popover 硬编码的 `inset-block-start/inset-inline-start`（原为左上角固定坐标），改为由 antd placement="topLeft" 自动定位，使弹窗跟随底部 User 按钮位置弹出 | 无 |
| UGS-008b | 2026-06-17 | modify | `src/layout/SPAGlobalProvider/index.tsx`, `src/layout/GlobalProvider/AppTheme.tsx` | 底层 colorPrimary 修复：①SPAGlobalProvider 传 `defaultPrimaryColor='geekblue'` 让 @lobehub/ui algorithm 生成蓝色色阶；②AppTheme 用 `customToken` 回调在 algorithm 之后精确覆盖 `colorPrimary: '#2563EB'`；③移除 token.colorPrimary（会被 algorithm mapToken 覆盖，无效）；④UGSciLogo 改回用 `cssVar.colorPrimary` | 无 |

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
