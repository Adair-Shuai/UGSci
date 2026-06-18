# UGSci 系统架构说明

> 本文档面向二次开发与 AI 辅助开发，目的是让任何接手者（人或 AI）能快速定位文件、理解模块职责与引用关系，并规范地记录每次修改。
>
> **项目本体**：基于 LobeHub（`@lobehub/lobehub` v2.2.4）的 AI Agent 框架。Next.js 16 + React 19 + TypeScript monorepo，含 Web SPA、Electron 桌面端、CLI、服务端 tRPC/Hono 等多端形态。

---

## 目录

1. [技术栈与版本基线](#1-技术栈与版本基线)
2. [Monorepo 顶层结构](#2-monorepo-顶层结构)
3. [路径别名系统（关键）](#3-路径别名系统关键)
4. [核心源码 `src/` 目录详解](#4-核心源码-src-目录详解)
5. [共享包 `packages/` 详解](#5-共享包-packages-详解)
6. [子应用 `apps/` 详解](#6-子应用-apps-详解)
7. [后端架构与数据流](#7-后端架构与数据流)
8. [状态管理与数据流](#8-状态管理与数据流)
9. [多端构建与部署](#9-多端构建与部署)
10. [二次开发导航](#10-二次开发导航)
11. [修改记录规范](#11-修改记录规范)

---

## 1. 技术栈与版本基线

| 维度 | 技术选型 | 版本 |
|---|---|---|
| 框架 | Next.js（App Router，承载后端 API + SPA HTML 服务） | ^16.1.5 |
| 前端框架 | React | 19.2.5 |
| 语言 | TypeScript（`tsgo` 原生预览做类型检查） | ^6.0.3 |
| SPA 构建 | Vite（与 Next.js 解耦，独立打包 SPA） | 8.0.14 |
| 路由 | react-router-dom v7（SPA 内部路由） | ^7.13.0 |
| 状态管理 | Zustand（slice 聚合 + devtools + 可重置模式） | 5.0.4 |
| 数据获取 | SWR + TanStack React Query + tRPC client | — |
| 后端 API | tRPC（lambda/async/mobile/tools 四套）+ Hono（Agent 网关/工作流） | tRPC ^11.8.1 |
| ORM | Drizzle ORM + drizzle-zod | ^0.45.1 |
| 数据库 | PostgreSQL（`pg`）；客户端 fallback pglite | pg ^8.17.2 |
| 认证 | better-auth（drizzleAdapter + 多 SSO/passkey/emailOTP） | 1.4.6 |
| 桌面端 | Electron（electron-vite + electron-builder） | — |
| UI 库 | `@lobehub/ui` v5（base-ui 优先）+ antd 6 | antd 6.3.5 |
| 样式 | antd-style（`createStaticStyles` 零运行时优先） | 4.1.0 |
| i18n | react-i18next + i18next | — |
| 包管理 | pnpm workspace（`pnpm@10.33.0`）；脚本用 `bun` 跑 | — |
| 测试 | Vitest（单元）+ Playwright/Cucumber（e2e） | vitest 3.2.6 |
| 监控 | OpenTelemetry + Langfuse + PostHog + Vercel Analytics | — |

> **版本锁定（package.json `overrides`/`pnpm.overrides`）**：`react` 19.2.5、`antd` 6.3.5、`better-auth` 1.4.6、`drizzle-orm` ^0.45.1、`lexical` 0.42.0、`pdfjs-dist` 5.4.530 等。修改依赖时注意这些硬锁版本。

---

## 2. Monorepo 顶层结构

```
UGSci/
├── src/                    # 主应用源码（Web SPA + Next.js 后端 + 共享前端）
├── apps/                   # 子应用
│   ├── desktop/            #   Electron 桌面端（独立 tsconfig，被根 tsconfig 引用）
│   ├── server/             #   服务端源码包（tRPC routers + services，由 Next.js 引用）
│   └── cli/                #   CLI 工具
├── packages/               # 共享包（@lobechat/* 与 @lobehub/*）
│   ├── database/           #   Drizzle schema/model/repository
│   ├── agent-runtime/      #   Agent 执行引擎
│   ├── model-runtime/      #   LLM Provider 与流式运行时
│   ├── trpc/               #   tRPC 基础设施（init/context/middleware/client）
│   ├── business/           #   业务定制子包（config/const/model-bank/model-runtime）
│   ├── business-server/    #   业务服务端 router（由 @/business/server/* 引用）
│   ├── const/ utils/ types/ config/  # 基础常量/工具/类型/配置
│   ├── tool-runtime/ prompts/        # 工具运行时/提示词
│   ├── web-crawler/ file-loaders/    # 数据采集
│   ├── openapi/                      # Hono OpenAPI HTTP 层
│   ├── electron-server-ipc/          # Electron↔Next.js 后端 socket IPC（服务端侧）
│   ├── electron-client-ipc/          # Electron 渲染进程侧 hooks
│   ├── desktop-bridge/               # 桌面↔后端协议常量
│   ├── builtin-tool-*                # 大量内置工具包（~30 个）
│   └── ...                           # 其余 ~60 个包
├── public/                 # 静态资源（含构建产物 public/_spa/*）
├── dist/                   # 构建产物
├── docs/                   # 文档（.mdx）
├── scripts/                # 构建工作流脚本（tsx 执行）
├── e2e/                    # 端到端测试（Cucumber + Playwright）
├── locales/                # 翻译产物 JSON（936 文件，CI 自动生成）
├── docker-compose/         # 本地开发 docker（postgres/redis/rustfs/searxng）
├── patches/                # pnpm patch（如 @upstash/qstash）
├── package.json            # 根 workspace 配置
├── pnpm-workspace.yaml     # workspace 定义：packages/*, packages/business/*, e2e, apps/desktop/src/main
├── tsconfig.json           # 根 TS 配置（含路径别名，见下节）
├── next.config.ts          # Next.js 配置（委托 src/libs/next/config/define-config）
├── drizzle.config.ts       # Drizzle 配置（schema: packages/database/src/schemas）
├── vite.config.ts          # SPA 构建配置
├── eslint.config.mjs / prettier.config.mjs / stylelint / knip.ts
└── AGENTS.md               # AI 开发指南（LobeHub 约定）
```

### workspace 范围（`pnpm-workspace.yaml` + `package.json.workspaces`）

- `packages/*` — 所有共享包
- `packages/business/*` — 业务子包
- `e2e` — 端到端测试
- `apps/desktop/src/main` — Electron 主进程（独立构建链）

---

## 3. 路径别名系统（关键）

**这是二次开发中最重要的一节**。项目通过 `tsconfig.json` 的 `paths` 把 packages 与 apps 映射成短别名，理解别名映射才能正确定位「真实文件」。

```jsonc
// tsconfig.json → compilerOptions.paths
{
  "@/database/*":     ["./packages/database/src/*"],            // 数据库层
  "@/const/*":        ["./packages/const/src/*", "./src/const/*"],        // 双源：包优先，本地兜底
  "@/utils/*":        ["./packages/utils/src/*", "./src/utils/*"],        // 双源
  "@/types/*":        ["./packages/types/src/*", "./src/types/*"],        // 双源
  "@/envs/*":         ["./packages/env/src/*", "./src/envs/*"],
  "@/libs/trpc/*":    ["./packages/trpc/src/*", "./src/libs/trpc/*"],     // tRPC 基础设施
  "@/config/*":       ["./packages/app-config/src/*", "./src/config/*"],
  "@/locales/*":      ["./packages/locales/src/*", "./src/locales/*"],
  "@/business/server/*": ["./packages/business-server/src/*", "./src/business/server/*"],
  "@/server/*":       ["./apps/server/src/*", "./src/server/*"],          // 服务端：apps/server 优先
  "@/*":              ["./src/*"],                                     // 主应用
  "~test-utils":      ["./tests/utils.tsx"]
}
```

### 双源别名的解析规则

形如 `"@/const/*": ["./packages/const/src/*", "./src/const/*"]` 的**双源别名**，TypeScript/bundler 按数组顺序解析：**先查 packages 源，找不到再查 src 源**。

| 你在代码里看到的 import | 真实文件位置（按优先级） |
|---|---|
| `@/const/xxx` | ① `packages/const/src/xxx` → ② `src/const/xxx` |
| `@/utils/xxx` | ① `packages/utils/src/xxx` → ② `src/utils/xxx` |
| `@/server/xxx` | ① `apps/server/src/xxx` → ② `src/server/xxx` |
| `@/libs/trpc/xxx` | ① `packages/trpc/src/xxx` → ② `src/libs/trpc/xxx` |
| `@/database/xxx` | `packages/database/src/xxx`（单源） |
| `@/xxx`（无子段） | `src/xxx` |
| `@lobechat/xxx` | `packages/xxx`（npm workspace 包名） |

> **修改文件前必须确认别名对应的真实路径**。例如改 `@/server/routers/lambda/agent` 实际是改 `apps/server/src/routers/lambda/agent`，不是 `src/server/`。

---

## 4. 核心源码 `src/` 目录详解

`src/` 同时承担三个职责：**① SPA 前端**、**② Next.js 后端 API**、**③ SPA HTML 模板服务**。

### 4.1 顶层布局

| 目录/文件 | 职责 | 引用关系 |
|---|---|---|
| `spa/` | SPA 多端入口 + 路由配置 | 被 `app/spa/[variants]` 输出的 HTML 加载 |
| `routes/` | 页面路由段（thin，只组合 features） | 被 `spa/router/*` lazy import |
| `features/` | 按领域组织的业务组件（130+） | 被 `routes` 与其他 features 引用 |
| `store/` | Zustand 状态管理（25+ 领域 store） | 被 features/services 消费 |
| `services/` | 客户端 API 服务层（80+） | 被 features/store 调用，发请求到后端 |
| `server/` | 服务端非 tRPC 代码（Hono 网关等） | 被 `app/(backend)` 路由桥接 |
| `app/` | Next.js App Router（后端 API + auth + SPA HTML） | Next.js 顶层入口 |
| `components/` | 跨业务通用 UI 组件（90+） | 被 features/routes 引用 |
| `business/` | 业务定制层（桌面/移动路由注入扩展点） | 被 `spa/router` 注入 |
| `layout/` | 全局布局与 Provider | 被 spa entry 包裹 |
| `const/` | 本地常量（与 packages/const 互补） | 被广泛引用 |
| `hooks/` `helpers/` `utils/` | 通用 hooks/辅助/工具 | 被广泛引用 |
| `libs/` | 第三方库封装（next/better-auth/trpc 等） | 被后端/前端引用 |
| `types/` `styles/` | 类型定义/全局样式 | — |
| `initialize.ts` | 应用初始化（dayjs/immer/错误兜底） | 被 spa entry 首行 import |
| `auth.ts` | better-auth 入口 | 被后端 auth 路由引用 |
| `instrumentation.ts` | OpenTelemetry 埋点 | Next.js 自动加载 |

> **注意**：没有独立的 `src/locales/` 与 `src/config/` 目录。i18n 资源在 `utils/i18n/` + `const/locale.ts`；配置散落在 `const/`、各 store 的 `initialState.ts`。

### 4.2 SPA 入口与路由（`src/spa/`）

5 个入口文件，结构一致：`import '../initialize'` → 创建路由 → `createRoot().render(<Provider><RouterProvider/>)`。

| 入口文件 | 端 | 路由配置 | 路由树 |
|---|---|---|---|
| `entry.web.tsx` | Web | `createAppRouter` | `desktopRoutes`（含 BootErrorBoundary） |
| `entry.desktop.tsx` | Electron 桌面 | `createAppRouter` | `desktopRoutes`（最精简） |
| `entry.mobile.tsx` | 移动 | `createAppRouter` | `mobileRoutes` |
| `entry.popup.tsx` | 弹窗窗口 | `createAppRouter` | `popupRoutes`（静态 import，单会话） |
| `entry.auth.tsx` | 独立认证 | `createBrowserRouter` | `authRoutes`（AuthShell 包裹，无 i18n） |

**路由配置文件**（`spa/router/`）：

| 文件 | 说明 |
|---|---|
| `desktopRouter.config.tsx` | 桌面完整路由树，导出 `sharedMainAreaChildren`（`/` 与 `/:workspaceSlug` 共享子路由）+ `desktopRoutes`。用 `dynamicElement`/`dynamicLayout` 做 lazy import |
| `desktopRouter.config.desktop.tsx` | 桌面专用变体（**必须与上一个同步**，否则白屏；`desktopRouter.sync.test.tsx` 守护） |
| `mobileRouter.config.tsx` | 移动路由树，子集更小，复用 `(main)` 下部分页面（`.then(m => m.MobileXxxPage)`） |
| `popupRouter.config.tsx` | 弹窗路由，静态 import |
| `authRouter.config.tsx` | 认证路由（signin/signup/oauth/reset-password 等） |
| `routeMeta.ts` | 路由元信息工厂（图标 + i18n 标题键） |

**路由工具**（`@/utils/router`）：`dynamicElement`、`dynamicLayout`、`ErrorBoundary`、`redirectElement`、`createAppRouter`。

> **添加新路由的约定**（见 `AGENTS.md`）：
> 1. `src/routes/` 只放路由段文件（`_layout/index.tsx`、`index.tsx`、动态段），保持 thin。
> 2. 业务逻辑与 UI 放 `src/features/<Domain>/`，从 `index.ts` 导出。
> 3. 路由文件用 `import { X } from '@/features/<Domain>'`。
> 4. **桌面路由必须同时更新** `desktopRouter.config.tsx` 与 `desktopRouter.config.desktop.tsx`。

### 4.3 页面路由段（`src/routes/`）

按平台路由组分目录：

```
routes/
  (main)/         桌面主应用（也供 mobile 复用）
    agent/        聊天主页（_layout, (chat)/_layout, profile, channel, topics, task/[taskId]）
    community/    发现/市场（(list)/ + (detail)/）
    resource/     资源/知识库
    memory/       记忆中心
    settings/     设置
    [workspaceSlug]/  工作空间镜像段（复用 sharedMainAreaChildren）
    eval/         评测
    (create)/     创作（image/video）
    tasks/ task/[taskId]/ (task-workspace)/  跨 agent 任务
    page/ fleet/ group/ devtools/ home/ _layout
  (mobile)/       移动专用（chat, community, me, settings, (home), _layout）
  (desktop)/      桌面专用（desktop-onboarding）
  (popup)/        弹窗（agent/[aid]/, group/[gid]/[tid]/）
  auth/           认证页（signin/signup/oauth/*）
  onboarding/     引导流程
  share/          分享页（t/[id] 话题, page/[id] 页面）
  verify-im/      IM 验证
```

**页面目录内部约定**：`index.tsx`（主体）、`_layout/`（布局）、`features/`（页面专属业务）、`components/`（页面专属通用）、`routeMeta.ts`（路由元）、`loading.tsx`（骨架）。

### 4.4 业务组件（`src/features/`）

共 **130+ 个 feature**，每个是自包含业务能力单元。主要类别：

- **Agent 相关**：`AgentBuilder`、`AgentHome`、`AgentInfo`、`AgentSetting`、`AgentSkillDetail/Edit`、`AgentTaskList/Manager/Tasks`、`AgentTopicManager`、`AgentDocumentsExplorer`、`AgentProfileCard` 等
- **聊天/会话**：`ChatInput`、`Conversation`、`Messenger`、`TopicCanvas`、`FloatingChatPanel`、`SuggestQuestions`、`Follow`
- **创作**：`EditorCanvas`、`EditorModal`、`PageEditor`、`PageExplorer`、`Pages`、`DocumentModal`
- **模型/工具/MCP**：`ModelSelect`、`ModelSwitchPanel`、`ServiceModel`、`MCP`、`Connectors`、`PluginsUI`、`OllamaModelDownloader`
- **导航/Shell**：`NavHeader`、`NavPanel`、`CommandMenu`、`RightPanel`、`FileSidePanel`、`ExplorerTree`、`Workspace`、`AuthShell`
- **用户/认证/设置**：`Auth`、`User`、`ProfileEditor`、`Setting`、`Verify`、`Onboarding`、`PWAInstall`
- **其他**：`AlertBanner`、`Billboard`、`ChangelogModal`、`DailyBrief`、`DataImporter`、`DevPanel`、`Fleet`、`LocalFile`、`ResourceManager`、`ShareModal`、`SkillStore`、`Electron` 等

每个 feature 典型结构：`index.tsx`（主组件导出）、`routeMeta.ts`（若对应路由）、`features/`（子能力）、`components/`、`hooks/`、`style.ts`、测试。

### 4.5 状态管理（`src/store/`）

约 **25 个领域 store**，统一模式（以 `store/agent/store.ts` 为例）：

- 用 `createWithEqualityFn` + `shallow` 创建
- `createStore` 聚合多个 `createXxxSlice(...)`，`flattenActions` 合并
- 实现 `ResetableStore`（`ResetableStoreAction` 子类）
- `createDevtools('agent')` 中间件 + `expose('agent', useStore)` 全局暴露
- 导出 `useXxxStore` hook 与 `getXxxStoreState` 取值函数

**store 目录结构**：`store.ts`（聚合）、`initialState.ts`、`slices/`、`selectors/`、`actions/`、`utils/`、`index.ts`。

**主要 store**：`agent`、`agentGroup`、`aiInfra`、`chat`（最大，含 aiAgent/aiChat/builtinTool/message/operation/plugin/portal/thread/topic/translate/tts 等 slice）、`device`、`discover`、`document`、`electron`、`eval`、`file`、`global`（含 `SettingsTabs` 枚举）、`home`、`image`、`library`、`notebook`、`page`、`serverConfig`、`session`、`task`、`tool`、`user`、`userMemory`、`video`、`middleware`（公共中间件 createDevtools/expose）。

### 4.6 客户端服务层（`src/services/`）

约 **80+ 服务模块**，封装对后端 API 调用。基础设施：
- `_auth.ts` — 注入认证头
- `_header.ts` — 请求头
- `_url.ts` — URL 构造

服务覆盖：`agentRuntime/`、`aiModel/`、`aiProvider/`、`chat/`、`chatGroup/`、`document/`、`electron/`、`file/`、`message/`、`plugin/`、`session/`、`skill/`、`topic/`、`user/`、`userMemory/`、`generation`、`knowledgeBase`、`mcp`、`task`、`upload`、`video`、`webBrowsing`、`cloudSandbox` 等。

### 4.7 服务端非 tRPC（`src/server/`）

| 目录/文件 | 说明 |
|---|---|
| `agent-hono/` | Hono Agent 网关，挂载于 `/api/agent/*`。`index.ts` 定义路由；`handlers/` 含 execAgent/runStep/toolResult/botCallback/gatewayCron/messengerWebhook/platformWebhook；`middlewares/` 含 bearerSecretAuth/qstashAuth/qstashOrApiKeyAuth/serviceTokenAuth |
| `workflows-hono/` | `/api/workflows/*` 的 Hono 应用（agent-signal、memory、task），用 QStash 调度 |
| `services/composio/` | Composio 集成 |
| `ld.ts` | LaunchDarkly |
| `manifest.ts` `metadata.ts` `spaHtml.ts` `translation.ts` | PWA manifest/元数据/SPA HTML 渲染/翻译工具 |

### 4.8 Next.js App Router（`src/app/`）

```
app/
  layout.tsx          根布局（html/body + Analytics）
  manifest.ts         PWA manifest
  robots.tsx          robots.txt
  [variants]/         国际化/变体路由组
  spa/[variants]/     SPA HTML 入口（按端变体输出 index.html，加载 entry.*.tsx）
  spa-auth/[locale]/  认证 SPA HTML 入口（authHtmlTemplate.ts）
  (backend)/          后端 API 路由组（不进 URL）
    api/              auth/[...all], auth/check-user, agent/stream, agent/[[...route]],
                      v1/[[...route]], version, composio/oauth/callback, webhooks/*, workflows/*, dev/*
    trpc/             lambda/[trpc], async/[trpc], mobile/[trpc], tools/[trpc]（四端点）
    webapi/           chat/[provider], create-image/comfyui, document/events, models/[provider],
                      stt/openai, tts/{edge,microsoft,openai}, revalidate, trace, user/avatar
    oidc/             [...oidc], callback/desktop, consent, handoff, interaction/[uid]
    oauth/            connector/callback
    market/           agent, oidc, social, user/me, user/[username]
    f/[id]            文件代理
    middleware/       auth, validate
```

> **没有 `src/app/(auth)` 目录**。认证 UI 走 `spa-auth/[locale]`，认证后端走 `(backend)/api/auth/[...all]`。

---

## 5. 共享包 `packages/` 详解

约 **90 个包**，全部 `@lobechat/*` scope（少数 `@lobehub/*`）。按层次分：

### 5.1 基础基座（无或极少内部依赖）

| 包 | 职责 |
|---|---|
| `types` | 全栈共享 TypeScript 类型基座 |
| `const` | 常量聚合（re-export ~30 模块：agent/bot/currency/desktop/file/llm/message/session/settings/theme/url 等） |
| `business-const` | 品牌与开关常量（`ENABLE_BUSINESS_FEATURES`、`BRANDING_PROVIDER`） |
| `utils` | 工具函数（base64/cookie/env/error/format/imageToBase64/mimeType/platform/pricing/sleep/url 等，分 `.`/`./server`/`./client`） |
| `config` | business-config + const 的聚合门面 |
| `env` | 环境变量 |

### 5.2 数据持久化层

**`database`（`@lobechat/database`）** — 最关键的包之一。

- **exports**：`.`→`src/index.ts`、`./schemas`→`src/schemas/index.ts`、`./test-utils`
- **结构**：`schemas/`（~45 个 schema）→ `models/`（~55 个数据访问）→ `repositories/`（聚合仓储）→ `core/`（`db-adaptor.ts` 的 `getServerDB()` 单例）→ `server/models/`
- **Schema 文件**：agent、message、topic、user、session、task、rag、apiKey、generation、betterAuth、oidc、rbac、workspace、aiInfra、agentDocuments、agentSkill、file、documentHistory、notification、pushToken、userMemories、verify 等
- **Model 示例**：`ApiKeyModel.findByKey(db, apiKey)`
- **Repository**（跨表聚合）：agentGroup、aiInfra、compression、dataExporter/Importer、home、knowledge、search、topicImporter、userMemory
- **迁移**：`packages/database/migrations/0000_init.sql` … `0098_*.sql`（99 个），`meta/` 下 100 个 snapshot JSON
- **配置**：根 `drizzle.config.ts`，`schema: ./packages/database/src/schemas`，`out: ./packages/database/migrations`

### 5.3 运行时层

**`agent-runtime`（`@lobechat/agent-runtime`）** — Agent 执行引擎。

- `core/AgentRuntime`（`runtime.ts`）：Plan→Execute 引擎，内置 `call_llm`/`call_tool`/`finish`/`request_human_approve` 等执行器
- `agents/`：`GeneralChatAgent`、`GraphAgent`
- `groupOrchestration/`：`GroupOrchestrationRuntime`、`GroupOrchestrationSupervisor`
- **与 model-runtime 的关键解耦**：agent-runtime **不硬依赖** model-runtime，采用依赖注入。`call_llm` 执行器调用 `this.agent.modelRuntime`（async iterable 流式消费），由应用层注入 `@lobechat/model-runtime` 的 `ModelRuntime` 实例。

**`model-runtime`（`@lobechat/model-runtime`）** — LLM Provider 中心。

- 核心导出：`ModelRuntime` 类、`BaseAI`、`RouterRuntime`、`createOpenAICompatibleRuntime`、错误分类器、`getModelPricing`
- **~40 个 Provider**：`LobeOpenAI`、`LobeAnthropicAI`、`LobeGoogleAI`、`LobeBedrockAI`、`LobeAzureAI`、`LobeDeepSeekAI`、`LobeQwenAI`、`LobeOllamaAI`、`LobeGroq`、`LobeMistralAI`、`LobeMoonshotAI`、`LobeVolcengineAI`、`LobeZhipuAI` 等
- 结构：`const/` `core/` `errors/` `helpers/` `providers/` `types/` `utils/` `runtimeMap.ts`
- 依赖 `business-model-bank`/`business-model-runtime`/`const`/`utils` + 各 LLM SDK

### 5.4 业务子包（`packages/business/`）

| 包 | 职责 |
|---|---|
| `business-config` | 业务侧 LLM/服务端配置（`.`/`./server`） |
| `business-const` | 品牌开关常量 |
| `business-model-bank` | 业务模型库配置（依赖 `model-bank`） |
| `business-model-runtime` | 模型映射与路由运行时选项 |

### 5.5 其他重点包

| 包 | 职责 |
|---|---|
| `trpc` | tRPC 基础设施：`lambda/`/`async/` 各有 `init.ts`/`context.ts`/`middleware/`；`client/` 提供前端 client |
| `tool-runtime` | 工具执行运行时 |
| `prompts` | 提示词模板（`.`/`./fileSystem`） |
| `web-crawler` | 网页抓取与正文提取（readability + happy-dom） |
| `file-loaders` | 文件解析（PDF/Office/Excel/图片，用 pdfjs/mammoth/officeparser/xlsx） |
| `openapi` | 基于 Hono 的 OpenAPI HTTP 层，复用 model-runtime |
| `electron-server-ipc` | Electron 主进程 socket IPC Server，让 Next.js 后端反向调用 Electron 能力 |
| `electron-client-ipc` | 渲染进程侧 React hooks/events 封装 |
| `desktop-bridge` | 桌面↔后端协议常量（`AUTH_REQUIRED_HEADER` 等） |
| `builtin-tool-*` | ~30 个内置工具包（calculator、web-browsing、memory、notebook、skill-store、claude-code、cloud-sandbox 等） |
| `context-engine` | 上下文引擎 |
| `conversation-flow` | 会话流 |
| `memory-user-memory` | 用户记忆 |
| `observability-otel` | OpenTelemetry 可观测性 |
| `llm-generation-tracing` | LLM 生成追踪 |

### 5.6 包间依赖关系总览

```
底层基座（无/少内部依赖）
  types ← const ← business-const
              ↑
           utils（依赖 const/types/ssrf-safe-fetch）
              ↑
  ┌───────────┴───────────┐
  │ database              │ model-runtime（依赖 business-model-bank/runtime, const, utils）
  │ （依赖 const/types/   │     ↑
  │  utils/business-*）   │  依赖注入
  │                       │  agent-runtime（仅依赖 p-map，注入 modelRuntime）
  └───────────────────────┘
              ↑
  openapi（依赖 model-runtime，Hono 暴露）
  tool-runtime → prompts → const
  web-crawler / file-loaders → ssrf-safe-fetch / utils
```

---

## 6. 子应用 `apps/` 详解

### 6.1 `apps/desktop`（Electron 桌面端）

- **构建**：electron-vite 6.0 + electron-builder 26，主入口 `./dist/main/index.js`
- **独立 tsconfig**（根 tsconfig.json `references` 指向它）
- **源码结构**：
  - `main/index.ts` → `core/App.ts`（`App` 类是核心容器，聚合 14 个 Manager）
  - `main/controllers/`（~25 个 Controller）：Auth、BrowserWindows、Cli、Gateway、Git、Mcp、Menu、NetworkProxy、ScreenCapture、ShellCommand、Shortcut、TrayMenu、Updater、Workspace 等。基于 `ControllerModule extends IpcService`，用 `@shortcut`/`@createProtocolHandler` 装饰器注册到 `IoCContainer`
  - `main/services/`：contentSearch、fileSearch、file、gatewayConnection、imessageBridge、zoom
  - `preload/index.ts` → `electronApi.ts`：`contextBridge.exposeInMainWorld('electronAPI', { invoke, onStreamInvoke, onScreenCaptureSession })`
  - `overlay/`：覆盖窗口（`overlay.html`、`popup.html`）

**主↔渲染通信（三层）**：
1. **标准 IPC**：`ipcRenderer.invoke` / `contextBridge`，封装在 `preload/invoke.ts`
2. **流式 IPC**：`preload/streamer.ts` 的 `onStreamInvoke`（LLM 流、屏幕捕获）
3. **跨进程 Socket IPC**（`@lobechat/electron-server-ipc`）：Electron 主进程跑 `ElectronIPCServer`（Unix socket/Windows named pipe），socket 路径写入 `os.tmpdir()/SOCK_INFO_FILE`；**Next.js 服务端**通过 `@lobechat/electron-server-ipc/ipcClient` 连接，反向调用 Electron 能力（屏幕捕获、本地文件、shell）

### 6.2 `apps/server`（服务端源码包）

- **非独立进程**，是源码包，由 Next.js 通过路径别名 `@/server/*` 引用
- **`src/routers/`**：四套 tRPC 路由
  - `lambda/`（主，~90 子 router）：agent、aiChat、aiModel、aiProvider、apiKey、document、knowledge、message、task、topic、user、userMemory、session、thread、share、generation、video 等
  - `async/`、`mobile/`、`tools/`
  - `lambda/index.ts` 聚合成 `lambdaRouter`，额外注入 `@/business/server/lambda-routers/*`（workspace、subscription、spend、topUp、referral、pageShare、taskTemplate 等 13 个业务 router）
- **`src/services/`**（~70 领域服务）：通过 `getServerDB()` 拿 `LobeChatDatabase` 单例，调 `packages/database` 的 Model/Repository
- **`src/modules/`**：AgentRuntime、AgentTracing、ModelRuntime、S3、GitHub、KeyVaultsEncrypt、Mecha、PluginStore、ContentChunk、LLMGenerationTracing、AssistantStore

### 6.3 `apps/cli`（CLI 工具）

- 入口 `src/index.ts` → `program.ts`（commander `parseAsync`）
- `src/commands/`（~40 命令）：agent、bot、doc、file、generate/{asr,image,text,tts,video}、kb、memory、message、model、plugin、provider、search、skill、task、login 等
- `src/api/`：HTTP/TRPC 客户端
- `src/auth/`：apiKey、credentials、refresh、resolveToken

---

## 7. 后端架构与数据流

### 7.1 后端通道分层

| 通道 | 用途 | 位置 |
|---|---|---|
| **tRPC（主）** | 类型安全 RPC，90+ router | `(backend)/trpc/{lambda,async,mobile,tools}/[trpc]` → `apps/server/src/routers/*` |
| **REST webapi** | 流式 LLM、TTS/STT、图片生成等不适合 tRPC 的 | `(backend)/webapi/*` |
| **api/** | auth、webhooks、workflows、agent stream、v1 公开 API | `(backend)/api/*` |
| **Hono 网关** | Agent 执行、QStash/网关回调 | `src/server/agent-hono`、`workflows-hono`（由 Next.js route 桥接） |

### 7.2 tRPC 基础设施链路

```
(backend)/trpc/lambda/[trpc]/route.ts   （Next.js catch-all 端点）
        │  fetchRequestHandler
        ↓
packages/trpc/src/lambda/init.ts        （initTRPC.context().create({ transformer: superjson })）
        │
packages/trpc/src/lambda/context.ts     （createLambdaContext：鉴权优先级）
        │  ① dev mock user
        │  ② X-API-Key（ApiKeyModel 校验）
        │  ③ OIDC JWT（Oidc-Auth header，validateOIDCJWT）
        │  ④ better-auth session（auth.api.getSession）
        ↓
apps/server/src/routers/lambda/index.ts （lambdaRouter 聚合 ~90 子 router + 业务 router）
        │
apps/server/src/services/*              （领域服务，调 getServerDB()）
        │
packages/database src/models/* | repositories/*  （数据访问）
        │
PostgreSQL（pg）/ 客户端 pglite
```

> **路径别名**：`@/libs/trpc/lambda` → `packages/trpc/src/lambda`（tsconfig paths 映射）

### 7.3 认证系统（better-auth）

| 关注点 | 路径 |
|---|---|
| 入口 | `src/auth.ts` |
| 核心配置 | `src/libs/better-auth/define-config.ts`（`betterAuth()` + `drizzleAdapter` 接 `serverDB` + schema） |
| 插件 | `admin`、`emailOTP`、`genericOAuth`、`magicLink`、`passkey`、`expo`、自定义 `emailWhitelist` |
| SSO | `sso/index.ts` + `parseSSOProviders` 动态装配 |
| 客户端 | `auth-client.ts`（web）+ `auth-client.desktop.ts`（桌面） |
| 路由 | `(backend)/api/auth/[...all]/route.ts`（`toNextJsHandler(auth)`）+ `check-user` + `resolve-username` |
| OIDC Provider | `(backend)/oidc/[...oidc]/route.ts`（项目自身也是 OIDC Provider，桌面经 `oidc/callback/desktop` 回流） |

**tRPC 鉴权与 better-auth 的关系**：`createLambdaContext` 按 4 级优先级鉴权（见 7.2），better-auth session 是其中一级。

### 7.4 数据库与迁移

- **Drizzle 配置**：根 `drizzle.config.ts`，`schema: ./packages/database/src/schemas`，`out: ./packages/database/migrations`
- **迁移文件**：`packages/database/migrations/0000_init.sql` … `0098_*.sql`（99 个 SQL + meta snapshot）
- **常用命令**：
  - `bun run db:generate` — 生成迁移（drizzle-kit generate + dbml）
  - `bun run db:migrate` — 执行迁移（`scripts/migrateServerDB/index.ts`）
  - `bun run db:studio` — Drizzle Studio
- **本地开发数据库**：`docker-compose/dev/`（postgresql + redis + rustfs + searxng），`bun run dev:docker` 启动

---

## 8. 状态管理与数据流

### 8.1 前端数据流总览

```
entry.*.tsx
  └─ initialize.ts（dayjs/immer/错误兜底）
  └─ spa/router/*Router.config.tsx（路由树）
       └─ dynamicElement/dynamicLayout → lazy import routes/(main|mobile|popup)/**/index.tsx
  └─ layout/GlobalProvider（NextThemeProvider 等）

routes/**/index.tsx（thin 页面段）
  ├─ import features/Xxx
  ├─ import components/Xxx
  ├─ import store/xxx
  └─ import services/xxx

features/Xxx/
  ├─ import store/xxx（读写状态）
  ├─ import services/xxx（数据获取）
  ├─ import components/Xxx
  └─ import utils/xxx

store/xxx/store.ts
  ├─ 聚合 store/xxx/slices/*
  ├─ import store/middleware（createDevtools/expose）
  ├─ import store/utils（flattenActions/ResetableStore）
  └─ import services/xxx（副作用 action 内调 API）

services/xxx.ts
  ├─ import services/_auth.ts / _header.ts / _url.ts
  └─ 调用后端 /api/* / /trpc/* / /webapi/*
```

**关键**：store 是单向数据中枢，services 是出站 API 边界，components/features 是消费层。`business/` 作为可选扩展点，在标准路由树上注入业务专属页面。

### 8.2 业务定制扩展点（`src/business/`）

`business/client/BusinessDesktopRoutes|MobileRoutes` 被 `spa/router/*Router.config.tsx` 注入额外路由段。这是业务定制层与开源主干的分界。

---

## 9. 多端构建与部署

### 9.1 开发命令

| 命令 | 用途 |
|---|---|
| `bun run dev:spa` | SPA 前端开发（Vite :9876，代理 API 到 :3010）。终端打印 Debug Proxy URL |
| `bun run dev` | 全栈开发（Next.js :3010 + Vite SPA 并发） |
| `bun run dev:next` | 仅 Next.js :3010 |
| `bun run dev:spa:mobile` | 移动 SPA :3012 |
| `bun run dev:spa:auth` | 认证 SPA :3013 |
| `bun run dev:desktop` | Electron 桌面开发（在 apps/desktop） |
| `bun run dev:docker` | 启动本地 docker（postgres/redis/rustfs/searxng） |

### 9.2 构建命令

| 命令 | 用途 |
|---|---|
| `bun run build` | 完整构建：SPA + SPA auth + copy + Next.js |
| `bun run build:spa` | Vite 构建 SPA（→ `public/_spa`） |
| `bun run build:spa:auth` | 认证 SPA（→ `public/_spa-auth`） |
| `bun run build:spa:mobile` | 移动 SPA |
| `bun run build:spa:copy` | 复制 + 生成 SPA 模板（`scripts/copySpaBuild.mts` + `generateSpaTemplates.mts`） |
| `bun run build:next` | Next.js 构建 |
| `bun run build:docker` | Docker 构建（含 MOBILE SPA） |
| `bun run build:vercel` | Vercel 构建（含 db:migrate） |

### 9.3 测试

| 命令 | 用途 |
|---|---|
| `bunx vitest run --silent='passed-only' '[file-path]'` | 跑单个测试（**禁止** `bun run test`，~10 分钟） |
| `bun run test-app` | 前端单元测试 |
| `bun run test:e2e` | e2e（Playwright） |
| `bun run type-check` | 类型检查（`tsgo --noEmit`） |
| `bun run lint` | 全量 lint（ts + style + type-check + circular） |

### 9.4 Git 工作流

- `canary` 是开发分支（云生产），`main` 是发布分支（周期性 cherry-pick canary）
- 新分支从 `canary` 创建，PR 指向 `canary`
- commit message 用 gitmoji 前缀
- 分支格式：`<type>/<feature-name>`

---

## 10. 二次开发导航

### 10.1 常见任务定位表

| 我想做的事 | 去哪里改 |
|---|---|
| 加一个新页面/路由 | ① `src/routes/<平台>/...` 加路由段 → ② `src/features/<Domain>/` 加业务组件 → ③ 桌面端同步更新 `spa/router/desktopRouter.config.tsx` **和** `desktopRouter.config.desktop.tsx` |
| 改某个页面的 UI | `src/features/<Domain>/`（不是 routes，routes 是 thin 的） |
| 加/改 Zustand 状态 | `src/store/<domain>/`（slices/initialState/actions/selectors） |
| 加/改前端 API 调用 | `src/services/<name>.ts`（注意 `_auth`/`_header`/`_url` 基础设施） |
| 加 tRPC 后端接口 | `apps/server/src/routers/lambda/<domain>.ts` + 在 `lambda/index.ts` 注册 |
| 加/改数据库表 | `packages/database/src/schemas/<name>.ts` → `bun run db:generate` 生成迁移 → `bun run db:migrate` |
| 加/改数据访问逻辑 | `packages/database/src/models/<name>.ts`（单表）或 `repositories/<name>.ts`（跨表） |
| 加 LLM Provider | `packages/model-runtime/src/providers/` |
| 加内置工具 | `packages/builtin-tool-<name>/` |
| 改 Agent 执行逻辑 | `packages/agent-runtime/src/core/runtime.ts` |
| 改 Electron 主进程能力 | `apps/desktop/src/main/controllers/` |
| 改认证/SSO | `src/libs/better-auth/define-config.ts` + `sso/` |
| 改 i18n 文案 | `src/locales/default/<namespace>.ts`（英文源）→ 镜像 `locales/en-US/` → 手译 `locales/zh-CN/`（其余交给 CI） |
| 改 Next.js 配置 | `src/libs/next/config/define-config`（不是根 next.config.ts 本身） |

### 10.2 修改前的检查清单

1. **确认别名真实路径**：看到 `@/server/xxx` → 实际是 `apps/server/src/xxx`；`@/const/xxx` → 先查 `packages/const/src/xxx` 再查 `src/const/xxx`。
2. **桌面路由双写**：改桌面路由必须同时改 `desktopRouter.config.tsx` 与 `desktopRouter.config.desktop.tsx`，否则白屏（有 `desktopRouter.sync.test.tsx` 守护）。
3. **组件优先级**：`@lobehub/ui/base-ui`（headless）> `@lobehub/ui` root > antd。base-ui 有的不要用 root 或 antd。
4. **样式优先**：`createStaticStyles` + `cssVar.*`（零运行时）；仅当确实需要运行时计算才用 `createStyles` + `token`。
5. **文件大小**：单文件超 ~800 行考虑拆分。
6. **测试**：用 `vi.spyOn` 而非 `vi.mock`；跑单测用 `bunx vitest run --silent='passed-only' '[file]'`。
7. **依赖版本**：注意 `package.json` 的 `overrides` 与 `pnpm.overrides` 硬锁版本。
8. **review 前读** `.agents/skills/review-checklist/SKILL.md`；设计用户流程读 `.agents/skills/ux/SKILL.md`。

### 10.3 关键文件速查

| 关注点 | 路径 |
|---|---|
| 路径别名定义 | `tsconfig.json` → `compilerOptions.paths` |
| Drizzle 配置 | `drizzle.config.ts` |
| Next 配置 | `next.config.ts` → `src/libs/next/config/define-config` |
| better-auth 入口 | `src/auth.ts` |
| better-auth 配置 | `src/libs/better-auth/define-config.ts` |
| tRPC lambda init | `packages/trpc/src/lambda/init.ts` |
| tRPC lambda context | `packages/trpc/src/lambda/context.ts` |
| tRPC 根 router | `apps/server/src/routers/lambda/index.ts` |
| tRPC Next.js 端点 | `src/app/(backend)/trpc/lambda/[trpc]/route.ts` |
| better-auth 路由 | `src/app/(backend)/api/auth/[...all]/route.ts` |
| DB 单例 | `packages/database/src/core/db-adaptor.ts` |
| DB 迁移目录 | `packages/database/migrations/` |
| SPA Web 入口 | `src/spa/entry.web.tsx` |
| 桌面路由配置 | `src/spa/router/desktopRouter.config.tsx`（+ `.desktop.tsx`） |
| Electron 主进程 | `apps/desktop/src/main/index.ts` → `core/App.ts` |
| Electron preload | `apps/desktop/src/preload/index.ts` |
| Electron IPC Server | `packages/electron-server-ipc/src/ipcServer.ts` |
| 桌面↔后端协议常量 | `packages/desktop-bridge/src/index.ts` |
| Hono Agent 网关 | `src/server/agent-hono/index.ts` |
| CLI 入口 | `apps/cli/src/index.ts` |
| Agent 执行引擎 | `packages/agent-runtime/src/core/runtime.ts` |
| LLM Provider 中心 | `packages/model-runtime/src/providers/` |
| i18n 默认文案 | `src/locales/default/*.ts` |
| AI 开发指南 | `AGENTS.md` |

---

## 11. 修改记录规范

> **每次对本项目进行修改时，必须在下方「修改记录」追加一条**，便于追溯与 AI 上下文重建。

### 记录格式

```
### [YYYY-MM-DD] 简短标题

**修改类型**：feat / fix / refactor / docs / chore / style / perf / test
**影响范围**：涉及的模块/目录（如 src/features/AgentHome, packages/database/src/schemas/agent.ts）

**变更内容**：
- 具体改了什么（文件 + 行为变化）

**原因**：
- 为什么改

**关联文件**（被本次修改影响或需同步知晓的文件）：
- `path/to/file.ts` — 关系说明

**破坏性变更**：是/否（若是，说明迁移方式）
**验证方式**：如何验证（测试命令/手动步骤）
```

### 修改记录

<!-- 在此追加每次修改记录，最新的放最上面 -->

### [2026-06-18] UGS 市场弹窗 API 500 优雅降级

**修改类型**：fix / ux
**影响范围**：`src/features/UgsMarket/UgsMarketContent.tsx`

**变更内容**：
- `renderList`：拆分 `isLoading || !data` 为独立的 loading 判断和 error 判断，错误时显示友好提示而非骨架
- `MarketDetailContent`：同理拆分，错误时显示「详情暂不可用」
- SWR 响应新增 `error` 字段解构用于区分 loading/error/empty 三态

**原因**：自托管环境无法访问 `market.lobehub.com`，所有 market API 返回 500。之前 error 和 empty 都被当作 loading 显示骨架，用户看到永久 loading

**破坏性变更**：否

### [2026-06-18] 修复 useClientDataSWR onErrorRetry 参数索引错误导致详情页无限加载

**修改类型**：fix
**影响范围**：`src/libs/swr/index.ts`（核心 SWR 基础设施）、`src/features/UgsMarket/UgsMarketContent.tsx`（UGS 市场弹窗）

**变更内容**：
- `src/libs/swr/index.ts`：`useClientDataSWR` 的 `onErrorRetry` 回调中，将 `...args` + 数字索引改为具名参数 `(error, _key, _config, revalidate, opts)`
  - **根因**：SWR v2.x `onErrorRetry` 签名是 `(error, key, config, revalidate, opts)` 共 5 个参数。原代码用 `args[2]` 取 revalidate（实际是 config 对象），`args[3]` 取 retryCount（实际是 revalidate 函数 → undefined）
  - **影响**：所有使用 `useClientDataSWR` 且首次 fetch 失败的页面（如社区市场 detail 页）会永远卡在 loading
- `src/features/UgsMarket/UgsMarketContent.tsx`：`MarketDetailContent` 改为只拉取当前 type 对应的详情 hook（避免同时触发 agent/skill/mcp 三个 SWR 请求）
- `LESSONS_LEARNED.md`：新增 INC-005 复盘记录 + 对应检查清单

**原因**：
- 用户反馈技能市场、能力市场点击卡片后详情页一直加载不出来
- 上游 LobeHub（canary 分支）同样存在此 bug，UGS fork 一并修复

**关联文件**：
- `LESSONS_LEARNED.md` — 新增 INC-005
- `src/features/UgsMarket/UgsMarketContent.tsx` — MarketDetailContent 优化
- `node_modules/swr/dist/_internal/types.d.mts` — SWR 签名验证源

**破坏性变更**：否
**验证方式**：`bun run type-check` 通过（无新增错误）；`grep -A 5 "onErrorRetry" node_modules/swr/dist/_internal/types.d.mts` 确认签名

**修改类型**：chore / docs
**影响范围**：仓库根（git 配置）、`.gitignore`、`ARCHITECTURE.md`、`UPSTREAM_SYNC.md`

**变更内容**：
- 从源码解压状态初始化为 git 仓库，配置双 remote（origin=Adair-Shuai/lobehub fork，upstream=lobehub/lobehub）
- 创建三层分支：`canary`（1:1 镜像 upstream/canary，跟踪 upstream）、`ugs/custom`（定制基线，跟踪 origin）
- `.gitignore` 追加 UGSci 本地文件忽略段（`.agents/` `.codex/` `.codex-corepack/` `.conductor/` `.cursor/` `.workbuddy/` `UGS_CUSTOMIZATIONS.md`）
- 新增 `ARCHITECTURE.md`（系统架构说明）与 `UPSTREAM_SYNC.md`（上游同步策略）
- 首个定制提交 `80e53b7a76` 推送到 `origin/ugs/custom`

**原因**：
- 建立规范的 fork 同步工作流，确保后续二次开发可与上游持续同步
- 在未改动 LobeHub 本体前建立工作流，成本最低

**关联文件**：
- `.gitignore` — 追加 UGSci local 段
- `ARCHITECTURE.md` — 新增（系统架构文档）
- `UPSTREAM_SYNC.md` — 新增（同步策略文档）

**破坏性变更**：否
**验证方式**：`git remote -v` / `git branch -vv` / `git status` 全部通过

---

*本文档由架构分析生成，后续随项目演进持续更新。若发现文档与代码不符，以代码为准并同步修正本文档。*
