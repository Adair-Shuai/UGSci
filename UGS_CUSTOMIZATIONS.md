# UGSci 定制改动登记表

> 本文件记录所有对 LobeHub 上游代码的定制改动，用于上游同步时识别冲突点。
> 规则见 [UPSTREAM\_SYNC.md](./UPSTREAM_SYNC.md) 第 7 节「定制隔离规范」。

## 登记规范

每条改动记录以下字段：

| 字段   | 说明                                                 |
| ---- | -------------------------------------------------- |
| ID   | `UGS-XXX` 递增编号                                     |
| 日期   | YYYY-MM-DD                                         |
| 类型   | `new-file`（新增文件）/ `modify`（修改上游文件）/ `config`（配置变更） |
| 文件   | 改动涉及的文件路径（相对项目根）                                   |
| 描述   | 改了什么、为什么改                                          |
| 标记   | 修改上游文件须在代码内打 `// UGS-MODIFY: UGS-XXX <说明>` 标记      |
| 冲突风险 | 低 / 中 / 高（该文件上游改动频率）                               |

---

## 改动记录

<!-- 最新改动放最上面 -->

| ID       | 日期         | 类型              | 文件                                                                                                                                                                                                                   | 描述                                                                                                                                                                                                                                                                                                   | 冲突风险   |
| -------- | ---------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| UGS-020  | 2026-06-22 | modify          | `src/components/Branding/ProductLogo/Custom.tsx`                                                                                                                                                                     | CustomImageLogo 内部增加 BRANDING\_LOGO\_URL 为空时的二级兜底（fallback UGSciLogo），防止上层 hasLogoUrl 守卫被未来重构旁路后渲染空图                                                                                                                                                                                                 | 低      |
| UGS-021  | 2026-06-22 | modify          | `src/features/UgsCapabilities/useInitPresetMcps.ts`, `src/features/UgsMarket/UgsMarketContent.tsx`                                                                                                                   | console.log/warn → debug 包替换：useInitPresetMcps 中 2 处 log + 2 处 warn 改用 debug (ugs:capabilities:presetMcp)；UgsMarketContent 中 1 处 warn 改用 debug (ugs:market:install)                                                                                                                                  | 低      |
| UGS-019  | 2026-06-22 | modify          | `src/features/UgsCapabilities/capabilityData.ts`, `src/features/UgsCapabilities/types.ts`, `src/features/UgsCapabilities/CommonTab.tsx`, `src/features/UgsCapabilities/ConnectorCard.tsx`                            | 能力中心分类映射重构：① unified 分类源（整合 MCP\_CATEGORY\_MAP + CATEGORY\_KEYWORD\_RULES + inferCategory）；② 删除 CommonTab 重复的 getConnectorCategory，统一导入 inferCategory；③ ConnectorCard 显示推断分类标签；④ 新增可扩展关键词规则，inferCategory 多信号推断（identifier → metadata → name/description/tools 关键词 → 兜底），支持 MCP metadata.category 声明 | 低      |
| UGS-000  | 2026-06-17 | new-file        | `ARCHITECTURE.md`                                                                                                                                                                                                    | 系统架构说明文档（二次开发导航）                                                                                                                                                                                                                                                                                     | 无（新文件） |
| UGS-001  | 2026-06-17 | new-file        | `UPSTREAM_SYNC.md`                                                                                                                                                                                                   | 上游同步策略文档                                                                                                                                                                                                                                                                                             | 无（新文件） |
| UGS-002  | 2026-06-17 | config          | `.gitignore`                                                                                                                                                                                                         | 追加 UGSci local 段，忽略本地 AI 工具配置目录                                                                                                                                                                                                                                                                      | 低      |
| UGS-003  | 2026-06-17 | config          | `.env`                                                                                                                                                                                                               | 本地开发环境配置（PostgreSQL 连接、密钥）。不提交 git                                                                                                                                                                                                                                                                   | 无      |
| UGS-004  | 2026-06-17 | new-file        | `UGS_CUSTOMIZATIONS.md`                                                                                                                                                                                              | 本登记表                                                                                                                                                                                                                                                                                                 | 无      |
| UGS-005  | 2026-06-17 | modify+new      | `src/libs/better-auth/define-config.ts`, `auth-client.ts`, `src/features/Auth/SignIn/*`                                                                                                                              | 手机号验证码登录（phoneNumber 插件 + 前端 UI + 模式切换）                                                                                                                                                                                                                                                              | 中      |
| UGS-006  | 2026-06-17 | modify          | `vite.config.ts`                                                                                                                                                                                                     | vite dev 中间件：auth 路由（/signin, /signup 等）返回 index.auth.html 而非 index.html，解决 dev 模式下 auth 页面 404                                                                                                                                                                                                      | 低      |
| UGS-007  | 2026-06-17 | modify          | `packages/database/src/schemas/user.ts`, `packages/database/src/models/user.ts`, `apps/server/src/services/user/index.ts`, `scripts/clerk-to-betterauth/index.ts`                                                    | drizzle 字段 phone→phoneNumber（DB 列名不变），让 better-auth phoneNumber 插件 schema 校验通过                                                                                                                                                                                                                       | 中      |
| UGS-008  | 2026-06-17 | modify          | `packages/business/const/src/branding.ts`, `index.html`, `src/app/manifest.ts`, `package.json`, `src/layout/GlobalProvider/AppTheme.tsx`                                                                             | 品牌定制：LobeHub→UGSci 储气智脑，主题色 #121E30/#2563EB，文字 Logo                                                                                                                                                                                                                                                  | 低      |
| UGS-009  | 2026-06-17 | modify+new      | `packages/builtin-agents/src/types.ts`, `index.ts`, `agents/ugs-*/`                                                                                                                                                  | 13 个储气库领域专家 agent（库容评估 / 产能评价 / 库容参数 / 注采运行 / 智能调峰 / 配产配注 / BPINN/PVT/ 产量不稳定 / 测井解释 / 数值模拟 / 完整性评价 / 文献写作）                                                                                                                                                                                           | 低      |
| UGS-009b | 2026-06-17 | fix             | `packages/builtin-agents/src/agents/ugs-capacity/systemRole.ts`                                                                                                                                                      | 修复嵌入 SY/T 7686 规范时遗留的重复闭合反引号（第 136 行多余 `` `; ``），导致 vite code-inspector 插件解析报 "Missing semicolon" 语法错误、首页白屏                                                                                                                                                                                          | 无      |
| UGS-014  | 2026-06-17 | config          | `.env`                                                                                                                                                                                                               | FEATURE\_FLAGS=-cloud\_promotion,-workspace,+knowledge\_base（2026-06-17 更新：恢复 market 社区功能，去掉 -market）                                                                                                                                                                                                | 无      |
| UGS-010  | 2026-06-17 | modify          | `src/routes/(main)/home/_layout/Header/index.tsx`, `src/routes/(main)/home/_layout/Footer/index.tsx`                                                                                                                 | 将账户模块 `<User />` 从顶部 Header 移至底部 Footer，紧挨问号（帮助中心）图标左侧；Header 不再显示用户信息（回退为面包屑导航）                                                                                                                                                                                                                     | 低      |
| UGS-010b | 2026-06-17 | modify+new      | `src/routes/(main)/home/_layout/Header/index.tsx`, `src/components/Branding/UGSciLogo.tsx`                                                                                                                           | 在 Header 左上角放置 UGSci 文字 Logo（"UG" 跟随文字色，"Sci" 用品牌主色 colorPrimary）；UGSciLogo 组件移至 `src/components/Branding/` 共享位置                                                                                                                                                                                     | 无      |
| UGS-010c | 2026-06-17 | modify          | `src/features/User/UserPanel/index.tsx`                                                                                                                                                                              | 移除 Popover 硬编码的 `inset-block-start/inset-inline-start`（原为左上角固定坐标），改为由 antd placement="topLeft" 自动定位，使弹窗跟随底部 User 按钮位置弹出                                                                                                                                                                              | 无      |
| UGS-008b | 2026-06-17 | modify          | `src/layout/SPAGlobalProvider/index.tsx`, `src/layout/GlobalProvider/AppTheme.tsx`                                                                                                                                   | 底层 colorPrimary 修复：①SPAGlobalProvider 传 `defaultPrimaryColor='geekblue'` 让 @lobehub/ui algorithm 生成蓝色色阶；②AppTheme 用 `customToken` 回调在 algorithm 之后精确覆盖 `colorPrimary: '#2563EB'`；③移除 token.colorPrimary（会被 algorithm mapToken 覆盖，无效）；④UGSciLogo 改回用 `cssVar.colorPrimary`                            | 无      |
| UGS-010d | 2026-06-17 | modify          | `src/features/NavPanel/SideBarHeaderLayout.tsx`                                                                                                                                                                      | 面包屑默认首页项从 HomeIcon 改为 UGSciLogo，使所有二级菜单（设置 / 社区 / 资源 / 记忆等）左上角统一显示 UGSci Logo 而非小房子；提取 logoNode 为 const 避免每次 render 重建                                                                                                                                                                               | 无      |
| UGS-010e | 2026-06-17 | modify+new      | `packages/const/src/meta.ts`, `packages/database/src/models/agent.ts`, `src/routes/(main)/home/_layout/Body/InboxEntry.tsx`, `InboxItem.tsx`, `packages/locales/src/default/chat.ts`, `public/avatars/ugs-ai.png`    | 默认助手从 "Lobe AI" 改名为 "UGS AI"，头像从 lobe-ai.png 改为 ugs-ai.png（蓝色储气罐卡通角色，品牌色 #121E30/#2563EB）                                                                                                                                                                                                            | 无      |
| UGS-015  | 2026-06-18 | new-file+modify | `src/features/UgsExperts/`（新增 `ugsExpertsData.ts`/`expertSelectors.ts`/`ExpertCard.tsx`/`ExpertDrawer.tsx`/`index.tsx`/`TeamCard.tsx`），`src/routes/(main)/ugs-experts/`，`src/store/global/selectors/systemStatus.ts` | 储气库专家广场页：4 列 Grid Card + 分类筛选 + 搜索 + Drawer (5 Tab) + 专家团召唤；仅展示层重构复用 agentStore/toolStore；菜单顺序改为能力→技能→专家                                                                                                                                                                                             | 低      |
| UGS-015b | 2026-06-18 | modify          | `packages/builtin-agents/src/agents/ugs-*/index.ts`（13 个文件）                                                                                                                                                          | 给所有 ugs-\* agent 添加 `persist: { model: DEFAULT_MODEL, provider: DEFAULT_PROVIDER }`，修复 getBuiltinAgent 创建的 agent 记录缺少 model/provider 导致显示 "自定义助理"                                                                                                                                                    | 无      |
| UGS-015c | 2026-06-18 | new-file+modify | `apps/server/src/services/file/impls/local.ts`（新增），`apps/server/src/services/file/impls/index.ts`（修改）                                                                                                                | 新增 `LocalFileImpl`（node:fs 本地存储），`createFileServiceModule` 检测 S3 四环境变量齐全才用 S3，否则 fallback 到本地，修复本地开发 "S3 environment variables are not set" 错误                                                                                                                                                       | 低      |
| UGS-018  | 2026-06-18 | new-file        | `LESSONS_LEARNED.md`                                                                                                                                                                                                 | 事故复盘与规避清单文档：记录 INC-001（agents 表级联删除误判）、INC-002（lucide-react 导出未验证）、INC-003（菜单顺序修改位置误判）；AGENTS.md 顶部加必读指引                                                                                                                                                                                             | 无      |

| UGS-022  | 2026-06-23 | new-file+modify | `CROSS_REFERENCE.md`（新增），`ARCHITECTURE.md`（修改），`AGENTS.md`（修改） | 系统架构更新：①新增 CROSS_REFERENCE.md 函数/代码/功能交叉引用文档；②ARCHITECTURE.md 新增第 12 节 UGS 定制层架构（Feature 矩阵、品牌体系、认证定制、桌面构建、内置 Agent、配套文档索引）；③AGENTS.md 新增 CROSS_REFERENCE.md 查阅规则 | 无（新文件） |
| UGS-021  | 2026-06-22 | modify          | `src/features/UgsCapabilities/useInitPresetMcps.ts`, `src/features/UgsMarket/UgsMarketContent.tsx` | console.log/warn 替换为 debug 包：useInitPresetMcps 中 2 处 log + 2 处 warn 改用 debug (ugs:capabilities:presetMcp)；UgsMarketContent 中 1 处 warn 改用 debug (ugs:market:install) | 低      |
| UGS-020  | 2026-06-22 | modify          | `src/components/Branding/ProductLogo/Custom.tsx` | CustomImageLogo 增加 BRANDING_LOGO_URL 为空时的二级兜底（fallback UGSciLogo） | 低      |
| UGS-021b | 2026-06-23 | modify          | `src/libs/better-auth/auth-client.desktop.ts` | 补 emailOTPClient 和 phoneNumberClient 插件导出，修复 rolldown 构建失败 | 中      |
| UGS-022b | 2026-06-23 | modify          | `src/spa/router/desktopRouter.config.tsx`, `src/spa/router/desktopRouter.config.desktop.tsx`, `src/routes/(desktop)/desktop-onboarding/features/LoginStep.tsx`, `src/features/Electron/AuthRequiredModal/index.tsx`, `src/features/Auth/SignIn/useSignIn.ts`, `packages/locales/src/default/auth.ts`, `locales/en-US/auth.json`, `locales/zh-CN/auth.json`, `src/services/electron/remoteServer.ts`, `src/store/electron/actions/sync.ts` | 桌面端登录对齐：补齐 desktopRouter 缺失的Auth路由（verify-email/reset-password/set-password/auth-error）；登录流程重构（LoginStep/AuthRequiredModal 大幅简化）；useSignIn 共享邮箱 OTP 逻辑；新增 36 个 UGS 翻译键；远程服务配置 + Electron sync 改进 | 中      |
| UGS-023  | 2026-06-23 | new-file        | `CROSS_REFERENCE.md` | 新增跨模块引用文档 | 无（新文件） |


## 临时 Workaround（不提交 git，仅记录）

| 日期         | 问题                        | 处理方式                                                                                            |
| ---------- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| 2026-06-17 | pgvector 扩展未装（无 MSVC 编译）  | 临时修改 0005/0006/0037/0070 迁移文件，vector (1024)→text、hnsw→btree，跑完迁移后 git checkout 恢复。后续需装 pgvector |
| 2026-06-17 | pg\_search 扩展未装（ParadeDB） | 临时注释 0090/0093 迁移文件，跑完迁移后 git checkout 恢复。后续需装 pg\_search 或改用 pg\_trgm                          |

## UGS-005 详情：手机号登录

**改动的文件：**

| 文件                                             | 类型       | 说明                                                                                            |
| ---------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `src/libs/better-auth/define-config.ts`        | modify   | 加 phoneNumber 插件（sendOTP dev 模式 console.log，signUpOnVerification 允许注册）；phoneNumber→phone 字段映射 |
| `src/libs/better-auth/auth-client.ts`          | modify   | 加 phoneNumberClient 插件，导出 phoneNumber 方法                                                      |
| `src/features/Auth/SignIn/SignInPhoneStep.tsx` | new-file | 手机号 + 验证码登录界面组件                                                                               |
| `src/features/Auth/SignIn/index.tsx`           | modify   | 加 mode 切换，默认手机号登录                                                                             |
| `src/features/Auth/SignIn/useSignIn.ts`        | modify   | 加手机号 OTP 发送 / 验证逻辑、倒计时、模式切换                                                                   |

**后端验证：** `POST /api/auth/phone-number/send-otp` 返回 `{"message":"code sent"}`，OTP 验证码打印到 Next.js 控制台。

**待办：** 生产环境需在 `sendOTP` 里对接 SMS 服务商（Twilio / 阿里云短信 / 腾讯云短信）。

## UGS-006 详情：vite dev auth 路由分流

**问题：** LobeHub 有两个 SPA 入口 ——`index.html`（主应用，`entry.web.tsx` → `desktopRoutes`）和 `index.auth.html`（auth 页面，`entry.auth.tsx` → `authRoutes`）。生产环境 Next.js 按路径自动分流，但 vite dev 模式下只有一个 dev server，默认所有路由返回 `index.html`，导致 `/signin` 等路由在客户端找不到匹配 → 404。

**修复：** 在 `vite.config.ts` 添加 `ugs-auth-html-router` 中间件插件，拦截 auth 路由（`/signin`, `/signup`, `/verify-email`, `/reset-password`, `/auth-error`, `/market-auth-callback`, `/oauth/*`），返回 `index.auth.html` 的内容（经 `transformIndexHtml` 注入 HMR client）。API/trpc/oidc/webapi 和静态资源请求不受影响。

### UGS-023: 桌面端免认证登录

**目标**：桌面客户端用户无需登录即可直接使用，无需后端服务器。

**实现方式**：
- 新增 `NEXT_PUBLIC_DISABLE_AUTH` 环境变量（默认 `1`）
- 当值为 `1` 时，路由层跳过 `AuthShell` 包装，直接渲染子页面
- 用户打开客户端直接进入主界面，无需访问登录页
- 将值设为 `0` 或不设置可恢复登录流程

**配置文件**：
- `.env.desktop` — `NEXT_PUBLIC_DISABLE_AUTH=1`（桌面端默认）
- `apps/desktop/electron.vite.config.ts` — renderer define 中注入编译常量

**路由配置**：
- `src/spa/router/desktopRouter.config.tsx` — 条件式选择 `AuthShell` 或空 `Suspense`
- `src/spa/router/desktopRouter.config.desktop.tsx` — 同上（同步维护）

**涉及文件**：
- `.env.desktop`
- `apps/desktop/electron.vite.config.ts`
- `src/spa/router/desktopRouter.config.tsx`
- `src/spa/router/desktopRouter.config.desktop.tsx`

**验证方式**：
- 桌面端构建后打开应用，应直接进入主界面，无登录页
- 运行桌面路由同步测试：`bunx vitest run --silent='passed-only' 'src/spa/router/desktopRouter.sync.test.tsx'`
