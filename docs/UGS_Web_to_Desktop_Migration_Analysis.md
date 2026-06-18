# UGSci 网页端 → 桌面端迁移影响评估报告

> 生成时间：2026-06-18
> 基于对 `src/features/Ugs{Experts,Capabilities,Skills,Shared}/`、`src/spa/entry.*.tsx`、`src/spa/router/desktopRouter.config*.tsx`、`apps/desktop/` 的全面代码审查。

---

## 一、总体评估

**影响等级：低风险**。UGSci 三个页面（能力中心/技能中心/专家广场）的**业务逻辑层完全平台无关**，不直接依赖任何 Electron 专有 API。迁移的主要影响集中在**外层布局容器**（高度计算、标题栏偏移）和**桌面端专有能力**（stdio MCP、本地文件访问）的可用性差异上。

---

## 二、影响维度分析

### 2.1 UI 布局适配 — 影响等级：⭐⭐ 中低

| 检查项 | 现状 | 桌面端影响 | 处理建议 |
|--------|------|-----------|---------|
| **可用高度** | Web 端 `height: 100%` | Electron 端减去 `TITLE_BAR_HEIGHT=38px`（`calc(100% - 38px)`），见 `src/routes/(main)/_layout/index.tsx:71-77` | ✅ 无需修改，布局框架已自动处理 |
| **容器 padding-top** | Web 端 `8px` | Electron 端 `0px`（`DesktopLayoutContainer.tsx:24`），因为标题栏已提供视觉间距 | ✅ 无需修改 |
| **容器背景** | Web 端 `cssVar.colorBgLayout` | Electron 端 `transparent`（为了 macOS vibrancy 效果），见 `DesktopLayoutContainer/style.ts:31` | ✅ 无需修改，但需关注暗色主题下的 antd 组件对比度 |
| **页面宽度策略** | 固定 `max-width`（1200/1400px）+ `margin: 0 auto` 居中 | 桌面窗口最小 1000×600px，通常 ≥1200px，**所有 max-width 均能完整显示** | ✅ 无需修改 |
| **Grid 响应式断点** | `UgsSkills/CommonSkillsTab.tsx`: 3/2/1 列；`UgsSkills/InstalledTab.tsx`: 3/2/1 列 | 窗口 ≥1000px 时始终 >= `md` 断点，保持 3 列。**但如果用户缩小窗口到 ~800px 以下，会触发 2 列甚至 1 列布局。** | ⚠️ 注意：`responsive.md` / `responsive.sm` 断点在极小窗口下仍会触发，可能导致卡片布局变化。建议桌面端将 Grid 固定为 3 列 |
| **滚动容器** | `UgsCapabilities` 和 `UgsExperts` 使用 `overflow-y: auto` + `height: 100%` | 桌面端有效高度减少 38px，滚动区域略短，**不影响功能** | ✅ 无需修改 |
| **自定义滚动条** | `UgsCapabilities/index.tsx` 有 `::-webkit-scrollbar` 样式（宽 6px） | Electron Chromium 同样支持 webkit 滚动条样式 | ✅ 无需修改 |

### 2.2 API 调用方式差异 — 影响等级：⭐ 低

| 检查项 | 现状 | 桌面端影响 | 处理建议 |
|--------|------|-----------|---------|
| **数据获取（SWR）** | 统一通过 `useToolStore` / `useAgentStore` / TRPC | Web 和 Desktop 共用同一套后端 API（`app.lobehub.com` 或自部署服务器） | ✅ 无需修改 |
| **路由导航** | `navigate('/agent/:id')` / `navigate('/group/:groupId')` | 桌面端多窗口管理（`BrowserManager`）通过 `DesktopNavigationBridge` 组件桥接，无需业务代码感知 | ✅ 无需修改 |
| **MCP 连接器** | `useToolStore.fetchConnectors()` 拉取连接器列表 | **`stdio` 类型 MCP 仅在 Electron 下可用**（Web 端 MCP 只能用 `sse`/`streamableHttp` 类型）。UGSci 预置的 `neqsim-mcp-server` 和 `pyrestoolbox-mcp` 使用 `stdio` 传输 | ⚠️ 能力中心的 ConnectorCard 应标注传输类型（stdio/sse/http），提示用户 Web 端不可用 |
| **专家对话** | `refreshBuiltinAgent(slug)` → `builtinAgentIdMap[slug]` → `navigate` | Agent 执行目标：桌面端默认 `local`（本机执行），Web 端默认 `none` 或 `sandbox`。桌面端本机可以运行 Python/Shell 等 | ✅ 无需修改，但桌面端体验更好 |

### 2.3 本地存储机制 — 影响等级：⭐ 极低

| 检查项 | 现状 | 桌面端影响 | 处理建议 |
|--------|------|-----------|---------|
| **缓存层（SWR）** | 统一 `localStorageProvider.ts`：IndexedDB（大业务数据）+ localStorage（列表壳数据），按 `userId:workspaceId` 分区 | 完全相同，无 Electron 专有存储（如 `electron-store`） | ✅ 完全无影响 |
| **用户配置** | Zustand persist → localStorage | 相同 | ✅ 无影响 |
| **聊天草稿** | `ChatInput/draftStorage.ts` → localStorage | 相同 | ✅ 无影响 |

### 2.4 渲染性能差异 — 影响等级：⭐⭐ 中低

| 检查项 | 现状 | 桌面端影响 | 处理建议 |
|--------|------|-----------|---------|
| **代码加载策略** | Web 端：`dynamicElement(() => import(...))` 懒加载 + 代码分割 | 桌面端：同步 `import` 预打包（`desktopRouter.config.desktop.tsx`），无网络延迟 | ✅ 桌面端页面切换更快 |
| **首屏渲染** | Next.js SSR（Web）vs Electron 独立 HTML + SPA CSR（Desktop） | 桌面端无 SSR，首屏需等待 JS bundle 加载，但本地文件读取速度远超网络 | ✅ 桌面端实际体验更好 |
| **内存占用** | 所有 UGSci 页面组件 ~900 行代码，状态管理复用已有 stores | 桌面端 Electron 主进程 + 渲染进程共享内存，比浏览器略高，但 UGSci 页面本身不增加显著开销 | ✅ 无影响 |
| **虚拟列表/大数据** | UGSci 页面无大量列表渲染（13 个专家、~10 个能力） | 无需虚拟列表优化 | ✅ 无影响 |

### 2.5 样式与交互适配 — 影响等级：⭐⭐⭐ 中等

| 检查项 | 现状 | 桌面端影响 | 处理建议 |
|--------|------|-----------|---------|
| **标题栏拖拽区域** | Web 端无标题栏 | 桌面端 `TitleBar` 占据顶部 38px，包含标签栏、窗口控制按钮。页面内容不能与标题栏区域重叠 | ✅ 布局框架已通过 `calc(100% - 38px)` 隔离，无需页面级适配 |
| **窗口大小变化** | Web 端浏览器窗口可自由缩放 | 桌面端窗口最小 1000×600px，用户可自由缩放。UGS 页面的固定 `max-width` 布局在窗口缩小时居中留白增加 | ⚠️ 建议：为 UGS 页面添加 `min-width` 保护，防止窗口小于 900px 时出现水平滚动条或布局崩溃 |
| **antd Modal/Drawer** | 使用 Lobe 封装的 `createModal` 等 | 桌面端窗口较小（如 1000px）时，Drawer 宽度（默认 378px）可能占比较大 | ⚠️ 注意：`ExpertDrawer` 宽度需确认是否适配 1000px 窗口 |
| **antd 主题变量** | `createStaticStyles({ cssVar })` 使用 antd-style 的 CSS 变量 | 桌面端背景为 `transparent`（非 `colorBgLayout`），antd 的 `colorBgContainer` 等变量在暗色/透明背景下可能对比度不足 | ⚠️ 需在桌面端暗色主题下验证 antd 组件可读性 |
| **键盘快捷键** | UGSci 页面无自定义快捷键 | 桌面端注册了大量全局快捷键（`RegisterHotkeys`），可能与 UGSci 页面的输入框冲突 | ✅ 低风险，antd Input 聚焦时自动屏蔽全局快捷键 |

---

## 三、UGS 页面专项检查

### 3.1 能力中心（`/ugs-capabilities`）

| 检查项 | 结论 |
|--------|------|
| MCP 连接器展示 | ⚠️ `stdio` 类型在 Web 端不可用，应标注传输类型 |
| 预置 MCP 安装（`useInitPresetMcps`） | ✅ `installCustomPlugin` 纯前端操作，无平台依赖 |
| 能力市场弹窗（`createSkillStoreModal`） | ✅ 复用 Lobe 组件，已适配桌面端 |
| 添加能力按钮（`AddSkillButton`） | ✅ 复用 Lobe 组件 |
| **代码冗余** | 🔴 **严重**：`index.tsx` 包含**两个完整组件定义**（两个 `createStaticStyles` + 两个 `UgsCapabilitiesPage`），第 153-348 行版本功能完整，第 448-593 行版本是旧版残留，需清理 |

### 3.2 技能中心（`/ugs-skills`）

| 检查项 | 结论 |
|--------|------|
| 响应式 Grid | ⚠️ 桌面端固定窗口场景，3/2/1 列自适应无实际意义，建议固定 3 列 |
| 技能详情弹窗（`createBuiltinAgentSkillDetailModal`） | ✅ 复用 Lobe 组件 |
| 技能市场弹窗（`createSkillStoreModal`） | ✅ 复用 Lobe 组件 |

### 3.3 专家广场（`/ugs-experts`）

| 检查项 | 结论 |
|--------|------|
| 专家卡片 Grid（`auto-fill, minmax(340px, 1fr)`） | ✅ 自适应良好，1000px 窗口约 2-3 列 |
| 专家详情 Drawer | ⚠️ 需确认 1000px 窗口下 Drawer 宽度是否合理 |
| 一键进入对话 | ✅ `refreshBuiltinAgent` + `navigate`，纯前端操作 |
| 专家团召唤 | ✅ `chatGroupService.createGroupWithMembers`，API 调用无平台差异 |

---

## 四、迁移前的路由同步强制检查

两个路由配置文件 **必须保持路径一致**，否则会导致**白屏**：

```bash
# 运行同步测试
bunx vitest run --silent='passed-only' src/spa/router/desktopRouter.sync.test.tsx
```

测试检查项：
- ✅ Web (`desktopRouter.config.tsx`) 和 Desktop (`desktopRouter.config.desktop.tsx`) 的路径完全匹配
- ✅ `index: true` 路由数量一致
- ✅ `handle.meta` 声明完全一致

**当前 UGSci 路由在两套配置中均已正确注册**：
- `/ugs-experts`
- `/ugs-capabilities`
- `/ugs-skills`

新增路由时必须**同时更新两个文件**。

---

## 五、影响评估清单（Checklist）

### 🔴 必须修复

- [ ] **UgsCapabilities/index.tsx 代码冗余**：移除第 448-595 行的旧版组件定义，保留新版（含 scrollContainer + toolbar）
- [ ] **路由同步测试通过**：`bunx vitest run src/spa/router/desktopRouter.sync.test.tsx`

### 🟡 强烈建议

- [ ] **能力中心 MCP 传输类型标注**：在 ConnectorCard 上显示传输类型（stdio/sse/http），提示用户 stdio 仅桌面端可用
- [ ] **技能中心 Grid 响应式**：移除 `responsive.md`/`responsive.sm` 断点，桌面端固定 3 列
- [ ] **页面 min-width 保护**：为三个 UGS 页面添加 `min-width: 900px` 或更小的安全值
- [ ] **暗色主题验证**：在桌面端暗色主题下验证 UGS 页面所有 antd 组件的可读性（因容器背景为 `transparent`）

### 🟢 建议优化

- [ ] **Drawer 宽度适配**：`ExpertDrawer` 在 1000px 窗口宽度下测试，确认不被遮挡
- [ ] **滚动容器高度测试**：在桌面端验证三个页面的滚动行为（可用高度少 38px）
- [ ] **`desktopRouter.config.desktop.tsx` 同步导入**：确认 UGS 页面的同步 import 路径正确

---

## 六、迁移操作步骤建议

```text
第 1 步：运行现有测试，确保基线通过
  bunx vitest run src/spa/router/desktopRouter.sync.test.tsx
  bun run type-check

第 2 步：修复代码冗余（UgsCapabilities/index.tsx）
  删除第 352-595 行（旧版组件 + 重复的 createStaticStyles）

第 3 步：应用迁移适配修改
  - 技能中心 Grid 固定 3 列
  - 能力中心 ConnectorCard 添加传输类型标注
  - 页面添加 min-width

第 4 步：桌面端构建验证
  cd apps/desktop && bun run build

第 5 步：桌面端功能测试
  - 窗口缩放测试（1000~1920px）
  - 暗色/亮色主题切换
  - MCP 连接器功能验证
  - 专家对话/专家团创建流程
  - 技能详情/安装流程

第 6 步：运行全量类型检查
  bun run type-check
```

---

## 七、总结

UGSci 从网页端到桌面端的迁移**风险可控**。核心结论：

1. **业务逻辑零改动**：三个页面的 Zustand stores、API 调用、组件渲染逻辑完全平台无关
2. **布局自适应良好**：固定 `max-width` 居中策略天然适配桌面固定窗口，外层框架已处理 TitleBar 偏移
3. **唯一需要适配的点**：技能中心的响应式 Grid 断点和能力中心的 MCP 传输类型提示
4. **最急迫的修复**：`UgsCapabilities/index.tsx` 存在代码重复（两个组件定义），应在迁移前清理
