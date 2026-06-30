# UGSci 函数/代码/功能交叉引用（Cross-Reference Guide）

> **修改代码前必读**。本文档记录了模块间的依赖关系、数据流链路、数据库级联策略，以及已知的"改 A 断 B"波及链。
>
> 核心原则：**永远不要只改你看到的那个文件** —— 先查本文档明确波及范围。

---

## 目录

1. [层间数据流总览](#1-层间数据流总览)
2. [数据库级联关系（Cascading）](#2-数据库级联关系cascading)
3. [路由 ↔ Feature 映射](#3-路由--feature-映射)
4. [Store ↔ 消费者映射](#4-store--消费者映射)
5. [Service ↔ Router 映射](#5-service--router-映射)
6. [UGS 定制 Feature 内部结构](#6-ugs-定制-feature-内部结构)
7. [包依赖关系](#7-包依赖关系)
8. [已知修改波及链（Ripple Effects）](#8-已知修改波及链ripple-effects)
9. [桌面端构建依赖链](#9-桌面端构建依赖链)
10. [品牌定制波及范围](#10-品牌定制波及范围)

---

## 1. 层间数据流总览

```
SPA Entry (src/spa/entry.*.tsx)
  └─ Router Config (src/spa/router/*.config.*.tsx)
        └─ Route Segments (src/routes/...)
              ├─ UI Components (src/features/...)
              │     ├─ Store (src/store/...)          ← 读取/写入状态
              │     └─ Service (src/services/...)      ← 调用后端 API
              │           └─ tRPC Router (apps/server/src/routers/...)
              │                 └─ Server Service (apps/server/src/services/...)
              │                       └─ DB Model (packages/database/src/models/...)
              │                             └─ DB Schema (packages/database/src/schemas/...)
              └─ Shared Components (src/components/...)
```

**修改一条数据流时，需要检查的层**：
```
DB Schema 变动 → Model → Server Service → tRPC Router → Client Service → Store → Feature UI
Store 变动    → 所有消费该 store 的 features 和 services
Router 变动   → 必须同步 desktopRouter.config.tsx + config.desktop.tsx（否则白屏）
```

---

## 2. 数据库级联关系（Cascading）

> **危险操作预警**：对 `agents`、`sessions`、`topics`、`messages`、`files` 等核心表执行 DELETE/DROP/TRUNCATE 前，必须确认级联策略。

### 2.1 核心表级联策略速查

| 表名（Schema）               | 被谁引用（外键 onDelete cascade）                        | 删除风险 |
| -------------------------- | --------------------------------------------------- | ---- |
| **agents**                 | topics, messages, agentsToSessions, agentsFiles,<br>agentsKnowledgeBases, agentShares, agentBotProvider,<br>agentCronJob, agentDocuments, chatGroupAgents,<br>agentEvals 等 **11+ 张表** | **极高** |
| **sessions**               | topics, messages, agentsToSessions                  | 高    |
| **topics**                 | messages                                            | 高    |
| **messages**               | —（叶子表）                                            | 中    |
| **files**                  | agentsFiles, messageFiles, chunkEmbeds, etc.        | 高    |
| **users**                  | 几乎所有业务表（agents, sessions, topics, messages...）    | **极高** |

### 2.2 关键外键关系详细

```sql
-- agents 表的外键引用（来自 packages/database/src/schemas/）
topics:            agentId -> agents.id ON DELETE CASCADE
messages:          agentId -> agents.id ON DELETE CASCADE
messages:          topicId -> topics.id ON DELETE CASCADE
agentsToSessions:  agentId -> agents.id ON DELETE CASCADE
agentsFiles:       agentId -> agents.id ON DELETE CASCADE
agentsKnowledgeBases: agentId -> agents.id ON DELETE CASCADE
agentShares:       agentId -> agents.id ON DELETE CASCADE
```

### 2.3 安全操作命令

```bash
# 查看某张表的所有外键引用
grep -rn "references(() => <TABLE_NAME>.id" packages/database/src/schemas/

# 安全更新（不触发级联）
UPDATE agents SET model = 'xxx' WHERE slug = 'ugs-capacity';
```

### 2.4 Drizzle 迁移

| 项目            | 路径 / 命令                                           |
| ------------- | -------------------------------------------------- |
| 迁移文件          | `packages/database/migrations/`                    |
| Drizzle 配置    | `drizzle.config.ts`                                |
| 生成迁移          | `bun run db:generate`                              |
| 执行迁移          | `bun run db:migrate`                               |
| 注意            | 0090/0093 依赖 pg_search 扩展，本地未安装需临时注释        |

---

## 3. 路由 ↔ Feature 映射

### 3.1 主路由段

| 路由路径                              | 页面段位置（src/routes）                       | Feature 层（src/features）                               | Store 依赖            |
| --------------------------------- | ------------------------------------------ | ------------------------------------------------------ | ------------------- |
| `/`                               | `(main)/home/`                             | `AgentHome`, `NavPanel`, `User`                        | `agent`, `global`   |
| `/chat/:id` (agent)               | `(main)/agent/`                            | `Conversation`, `ChatInput`, `AgentInfo`, `Portal`     | `chat`, `agent`     |
| `/settings/...`                    | `(main)/settings/`                         | `Setting`, `ProfileEditor`, `AgentSetting`            | `global`, `user`    |
| `/ugs-capabilities`                | `(main)/ugs-capabilities/`                 | **UgsCapabilities**                                    | `tool`              |
| `/ugs-experts`                     | `(main)/ugs-experts/`                      | **UgsExperts**                                         | `agent`             |
| `/ugs-skills`                      | `(main)/ugs-skills/`                       | **UgsSkills**                                          | `tool`              |
| `/tasks`                           | `(main)/tasks/`                            | `AgentTaskList`                                        | `task`              |
| `/task/:id`                        | `(main)/task/[taskId]/`                    | `AgentTasks`                                           | `task`              |

### 3.2 桌面路由双写规则

> **必须在两个文件同步修改，否则白屏**。

| 配置文件                                     | 用途                     | 守护测试                                |
| ----------------------------------------- | ---------------------- | ----------------------------------- |
| `src/spa/router/desktopRouter.config.tsx`       | 桌面完整路由树                 | —                                   |
| `src/spa/router/desktopRouter.config.desktop.tsx` | 桌面专用变体                  | `desktopRouter.sync.test.tsx`（5 断言） |

**同步操作**：改 `config.tsx` -> 复制到 `config.desktop.tsx` -> 运行同步测试验证。

---

## 4. Store ↔ 消费者映射

| Store（`src/store/`） | 主要消费者（`src/features/`）                                   | 后端数据源（`apps/server/src/`） |
| ----------------- | ----------------------------------------------------------- | -------------------------- |
| `agent`           | `AgentHome`, `AgentInfo`, `AgentSetting`, `AgentProfileCard`, `UgsExperts`, `AgentBuilder`, `ChatInput` | `routers/lambda/agent`    |
| `chat`            | `Conversation`, `ChatInput`, `Messenger`, `Portal`, `FloatingChatPanel`, `SuggestQuestions`, `Follow` | `routers/lambda/message`, `topic` |
| `global`          | `NavPanel`, `Setting`, `CommandMenu`, `Auth`, `Onboarding`, `HotkeyHelperPanel` | 本地持久化                  |
| `session`         | `AgentHome`, `Conversation`                                  | `routers/lambda/session` |
| `tool`            | `UgsCapabilities`, `UgsSkills`, `PluginsUI`, `MCP`, `SkillStore`, `Connectors` | `routers/lambda/mcp`, `skill` |
| `discover`        | 社区页面段                                                    | `routers/lambda/discover` |
| `user`            | `User`, `ProfileEditor`, `Setting`                           | `routers/lambda/user`    |
| `file`            | `FileSidePanel`, `FileViewer`, `LocalFile`, `ResourceManager` | `routers/lambda/file`    |
| `electron`        | `Electron` feature, `desktop-onboarding`                     | `electron-server-ipc`    |
| `task`            | `AgentTaskList`, `AgentTasks`, `AgentTaskManager`            | `routers/lambda/task`    |

---

## 5. Service ↔ Router 映射

| 前端 Service（`src/services/`） | tRPC Router（`apps/server/src/routers/lambda/`） |
| --------------------------- | ------------------------------------------- |
| `aiModel/`                  | `aiModel`                                   |
| `aiProvider/`               | `aiProvider`                                |
| `chat/`                     | `message`                                   |
| `document/`                 | `document`                                  |
| `file/`                     | `file`                                      |
| `message/`                  | `message`                                   |
| `session/`                  | `session`                                   |
| `skill/`                    | `skill`                                     |
| `topic/`                    | `topic`                                     |
| `user/`                     | `user`                                      |
| `mcp/`                      | `mcp`                                       |
| `task/`                     | `task`                                      |
| `discover/`                 | `discover`                                  |

---

## 6. UGS 定制 Feature 内部结构

### 6.1 UgsCapabilities 能力中心

```
src/routes/(main)/ugs-capabilities/ -> src/features/UgsCapabilities/
  ├── index.tsx                 -> 主组件：Tab 切换（通用/已安装）
  ├── CommonTab.tsx              -> 通用 Tab：卡片列表 + 搜索 + 分类
  ├── InstalledTab.tsx           -> 已安装 Tab
  ├── CapabilityCard.tsx         -> 单个能力卡片
  ├── CapabilityDrawerContent.tsx -> 详情 Drawer
  ├── ConnectorCard.tsx          -> MCP Connector 卡片
  ├── capabilityData.ts          -> 分类映射规则 + 数据结构
  ├── types.ts                  -> 类型定义
  ├── presetMcps.ts              -> 预设 MCP Connector 列表
  └── useInitPresetMcps.ts       -> 初始化预设 MCP 的 hook
```

**依赖链**：`capabilityData.ts` -> `types.ts` -> `CommonTab.tsx` -> `ConnectorCard.tsx` -> `store/tool`

### 6.2 UgsExperts 专家广场

```
src/routes/(main)/ugs-experts/ -> src/features/UgsExperts/
  ├── index.tsx                 -> 主组件：搜索 + 分类筛选 + Grid
  ├── ExpertCard.tsx             -> 专家卡片（4 列 Grid）
  ├── ExpertDrawer.tsx           -> 专家详情 Drawer（5 Tab）
  ├── TeamCard.tsx               -> 专家团召唤卡片
  ├── ugsExpertsData.ts          -> 专家数据
  └── expertSelectors.ts         -> 分类/搜索/筛选逻辑
```

**依赖链**：`ugsExpertsData.ts` -> `expertSelectors.ts` -> `store/agent`（纯展示层）

### 6.3 UgsSkills 技能管理

```
src/routes/(main)/ugs-skills/ -> src/features/UgsSkills/
  ├── index.tsx                 -> 主组件：Tab 切换
  ├── CommonSkillsTab.tsx        -> 通用技能 Tab
  ├── InstalledTab.tsx           -> 已安装技能 Tab
  ├── AddSkillButton.tsx         -> 添加技能按钮
  └── ugsCommonSkills.ts         -> UGS 预设技能列表
```

**依赖链**：`store/tool` -> `services/skill` -> tRPC skill routers

### 6.4 UgsMarket 市场弹窗

```
src/features/UgsMarket/
  ├── index.tsx                 -> 弹窗入口
  └── UgsMarketContent.tsx       -> 内容组件（含 SWR 降级处理）
```

**依赖链**：`services/discover` -> market API（外部）

### 6.5 UgsShared 共享组件

```
src/features/UgsShared/
  ├── index.ts                  -> 导出
  ├── PageHeader.tsx             -> 统一页面标题
  └── AddSkillButton.tsx         -> 统一添加技能按钮
```

被 UgsCapabilities、UgsSkills、UgsExperts 引用。

---

## 7. 包依赖关系

| 核心包                            | 被引用位置                          | 说明                     |
| ------------------------------ | ------------------------------ | ---------------------- |
| `database`                     | `apps/server`, `@/database/*`   | Schema / Model / Repository |
| `trpc`                         | `apps/server`, `@/libs/trpc/*`  | tRPC 基础设施              |
| `agent-runtime`                | `apps/server`                   | Agent 执行引擎             |
| `model-runtime`                | `apps/server`, `business`       | LLM Provider 调度         |
| `const`                        | `@/const/*`                     | 全局常量 / meta            |
| `builtin-agents`               | `src/store/agent`               | 内置 Agent 模板（含 UGS）    |
| `builtin-tool-*`（~30 个）       | Agent 运行时自动加载                | 内置工具                   |
| `electron-server-ipc`          | `apps/desktop`                  | Electron↔Next.js IPC    |
| `electron-client-ipc`          | `src/features/Electron`         | 渲染进程侧 IPC              |
| `desktop-bridge`               | IPC 两端                         | 协议常量                   |

---

## 8. 已知修改波及链（Ripple Effects）

### 8.1 Branding / Logo 修改

| 改什么                           | 会影响到 |
| ----------------------------- | ---- |
| `BRANDING_LOGO_URL` 配置        | `ProductLogo` -> `CustomLogo` -> `CustomImageLogo` 的 **15+** 调用点（onboarding / auth / share / settings / desktop-onboarding） |
| `branding.ts` 产品名             | 页面标题、meta、desktop app name、desktop protocol scheme |
| `UGSciLogo.tsx` Logo 组件       | Header（home _layout）、Sidebar（SideBarHeaderLayout）、所有 ProductLogo fallback |
| 主题色 `_primaryColor`          | 全局 antd 主题色（AppTheme.tsx -> cssVar -> colorPrimary） |

**修改原则**：改 Logo 在 `Custom.tsx` 源头修，不要在调用点打地鼠（INC-004）。

### 8.2 路由修改

| 改什么              | 会影响到                                             |
| ---------------- | ------------------------------------------------ |
| 加新路由段           | 必须同时改 `desktopRouter.config.tsx` + `.desktop.tsx` |
| 改 `sidebarItems` | `DEFAULT_SIDEBAR_ITEMS` 决定默认顺序，但用户自定义持久化值会覆盖 |

### 8.3 Store 修改

| 改什么                          | 波及面积                              |
| ---------------------------- | --------------------------------- |
| `store/chat` message slice   | `Conversation`, `ChatInput`, `Messenger`, `Portal`, `FloatingChatPanel` 等 |
| `store/agent` currentAgent   | `AgentInfo`, `AgentSetting`, `AgentProfileCard`, `UgsExperts` |
| `store/tool` mcpStore        | `UgsCapabilities`, `MCP`, `Connectors`, `PluginsUI` |
| store selector 改名/删         | 所有消费该 selector 的组件（编译+运行时都断）       |

### 8.4 数据库修改

| 改什么                     | 波及面积                                |
| ----------------------- | ----------------------------------- |
| `agents` 表 schema       | 11+ 个外键表 + BuiltinAgent + Agent Store + 服务端 Service |
| `messages` 表 schema     | Message Store + Conversation UI + 搜索/导出 |
| field rename（如 phone）  | Model / Service / Store / tRPC / 前端类型 / 迁移文件 |

### 8.5 第三方依赖

| 依赖                | 风险                               |
| ----------------- | -------------------------------- |
| `lucide-react`    | 具名导出无法静态检查（INC-002）               |
| `swr`             | `onErrorRetry` 签名变化（INC-005）       |
| `electron`        | postinstall 脚本兼容性                  |
| `better-auth`     | phoneNumber 插件 API 兼容性             |
| 所有 hard lock 的依赖 | `package.json` `overrides` 中锁定的版本 |

### 8.6 认证系统

| 改什么                              | 波及面积                        |
| -------------------------------- | --------------------------- |
| better-auth `define-config.ts`   | Web + Desktop + OIDC + SSO  |
| `auth-client.ts` / `.desktop.ts` | 前端认证 API（emailOTP / phoneNumber / passkey） |
| `useSignIn.ts`                   | Web + Desktop + Onboarding 登录逻辑 |
| `NEXT_PUBLIC_DISABLE_AUTH`      | 桌面路由 + AuthRequiredModal + auth-client.desktop.ts + 路由层条件渲染 |

### 8.7 配置文件

| 文件 / 变量                | 波及面积             |
| ---------------------- | ---------------- |
| `NEXT_PUBLIC_DISABLE_AUTH` | 桌面端认证开关: 1=免登录(默认), 0=需登录 |
| `.env` FEATURE_FLAGS  | 功能开关（社区/知识库/工作空间） |
| `vite.config.ts`      | SPA 构建、auth 路由分流 |
| `tsconfig.json` paths | 所有 `@/xxx` import 的解析路径 |

---

## 9. 桌面端构建依赖链

### 9.1 文件依赖图

```
apps/desktop/
  ├─ package.json             -> name 决定 IPC pipe 名 + userData 路径 + 协议 scheme
  ├─ electron.vite.config.ts  -> 构建配置
  ├─ electron-builder.mjs     -> 打包配置
  ├─ src/main/index.ts        -> 主进程入口
  ├─ src/preload/index.ts     -> preload 脚本
  ├─ scripts/
  │   ├─ build.mjs
  │   └─ build-desktop.mjs
  └─ src/main/controllers/
      └─ RemoteServerConfigCtr.ts  (UGS)

packages/
  ├─ electron-server-ipc/     -> ipcServer.ts
  ├─ electron-client-ipc/     -> 渲染进程侧 hooks
  └─ desktop-bridge/          -> 协议常量
```

### 9.2 启动流程

```
electron-vite dev
  ├─ Vite dev server @:5173
  └─ Electron 主进程
       ├─ requestSingleInstanceLock()
       ├─ ElectronIPCServer.start() -> IPC pipe
       └─ BrowserWindow -> loadURL(http://localhost:5173)
```

### 9.3 常见问题

| 现象           | 排查命令                                            |
| ------------ | ----------------------------------------------- |
| 灰屏 / 启动失败   | `echo $ELECTRON_RUN_AS_NODE` -> unset            |
| 灰屏（残留进程）   | `pkill -9 -f ugsci-desktop-dev`                  |
| 灰屏（锁残留）    | `rm -f ~/Library/Application\ Support/ugsci-desktop-dev/Singleton*` |
| 构建失败         | 参考 INC-006 ~ INC-015                            |

---

## 10. 品牌定制波及范围

| 定制项      | 配置源                                      | 同步更新文件                                        |
| -------- | ---------------------------------------- | --------------------------------------------- |
| 产品名称    | `branding.ts`                            | `meta.ts`, `index.html`, `package.json`       |
| 主题色     | `package.json` `_primaryColor`           | `AppTheme.tsx`, `SPAGlobalProvider/`          |
| Logo     | `UGSciLogo.tsx`                          | 全项目 15+ `<ProductLogo />` 调用点              |
| 助手名/头像  | `meta.ts`                                | `public/avatars/ugs-ai.png`, Inbox 首页         |
| 桌面图标    | `apps/desktop/build/Icon.icns`           | `icon-dev.png`                               |
| 桌面应用名   | `apps/desktop/package.json#name`         | IPC pipe 名, userData 路径, 协议 scheme         |

---

## 维护说明

- **新增 Feature / Store / Router**：在对应表中追加一行
- **新增波及链**：每次事故复盘后在本文件第 8 节追加
- **每次修改前**：先查本文档 -> 再查 `LESSONS_LEARNED.md` -> 运行 `bun run type-check`
- **桌面路由**：跑同步测试 `bunx vitest run --silent='passed-only' 'src/spa/router/desktopRouter.sync.test.tsx`

---

_本文档伴随项目迭代持续更新。修改代码前先查本文档，查不到再查具体源代码。_
