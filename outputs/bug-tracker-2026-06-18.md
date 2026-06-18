# UGSci Bug 追踪与错误清单

> 整理日期：2026-06-18 | 来源：浏览器控制台 + 代码静态分析 + gstack 功能审查

---

## 一、运行时错误（浏览器控制台捕获）

### ERR-001：dayjs locale 加载失败

**报错：**
```
TypeError: Cannot read properties of undefined (reading 'locale')
    at zh-cn.js?v=e743654e:1:1169
```
```
Locale.tsx:28 dayjs locale for zh-CN not found, fallback to en
```

**根因：** `Locale.tsx` 使用 `import.meta.glob('/node_modules/dayjs/locale/zh-cn.js')` 加载 UMD 格式的 dayjs locale 文件。Vite dev 模式通过绝对路径 glob 加载时绕过 `optimizeDeps` 预打包，导致 locale 内部 `require("dayjs")` 解析到未定义的实例。

**修复：** 改用 `import('dayjs/locale/zh-cn')` 动态导入（18 locale lookup map），走 Vite optimizeDeps 管道。

**修复文件：** `src/layout/SPAGlobalProvider/Locale.tsx`

**关联测试模板（来自 api-testing-strategy.md §4.4）：**
- 单元测试应验证 `updateDayjs('zh-CN')` → `dayjs.locale()` 调用成功
- 输入验证：非法 locale 字符串应 fallback 到 'en'

---

### ERR-002：Market API 全部返回 500

**报错：**
```
TRPCClientError: Failed to fetch skill list
TRPCClientError: Failed to fetch skill detail
TRPCClientError: Failed to fetch mcp detail
```

**根因：** 自托管环境无法访问 `market.lobehub.com`（默认 `MARKET_BASE_URL`）
**影响端点：** `lambda/market.skill.getSkillList`、`lambda/market.skill.getSkillDetail`、`lambda/market.getMcpDetail`、`lambda/market.getMcpList` 等全部市场相关 TRPC 路由

**修复：**
1. `src/libs/swr/index.ts` — `onErrorRetry` 参数索引从 `args[2]/args[3]` 修正为 `args[3]/args[4]`（阻止无限重试导致永久 loading）
2. `src/features/UgsMarket/UgsMarketContent.tsx` — 拆分 loading/error 三态渲染，显示"市场暂不可用"

**关联测试模板（来自 api-testing-strategy.md §5.3）：**
- Market router 集成测试应 mock `MarketService` 模拟 API 不可达场景
- 契约测试应验证前端 `useFetchSkillDetail` SWR key 与后端 `getSkillDetail` 输入 schema 一致

---

### ERR-003：Base UI nativeButton 警告

**报错：**
```
Base UI: A component that acts as a button expected a non-<button> because the
`nativeButton` prop is false. Rendering a <button> keeps native behavior while
Base UI applies non-native attributes and handlers, which can add unintended extra 
attributes (such as `role` or `aria-disabled`).
    at AddSkillButton (AddSkillButton.tsx:77:7)
    at UgsCapabilitiesPage (index.tsx:263:7)
```

**根因：** `DropdownMenu` 传了 `nativeButton={false}`，但子组件 `<Button>`（`NATIVE_BUTTON_MAP['Button']=true`）是原生 `<button>`，Base UI 检测到冲突。

**修复：** 移除 `nativeButton={false}` prop，让 `useNativeButton` hook 自动检测。

**修复文件：** `src/features/UgsSkills/AddSkillButton.tsx`（现已迁移到 `UgsShared/AddSkillButton.tsx`）

---

### ERR-004：antd 废弃 API 警告

**报错（预存，非本次引入）：**
```
Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.
Warning: [antd: Drawer] `width` is deprecated. Please use `size` instead.
Warning: [antd: Drawer] `height` is deprecated. Please use `size` instead.
Warning: [antd: Modal] `maskClosable` is deprecated. Please use `mask.closable` instead.
```

**状态：** 上游 LobeHub 代码残留，不影响功能，暂不修复

---

## 二、SWR 数据流 Bug

### SWR-001：`useClientDataSWR` onErrorRetry 参数索引错误

**位置：** `src/libs/swr/index.ts:48-61`

**原代码（错误）：**
```ts
onErrorRetry: (error: any, ...args: any[]) => {
  const revalidate = args[2];  // 实际是 config 对象，不是 revalidate 函数
  const { retryCount } = args[3];  // 实际是 revalidate 函数，retryCount 为 undefined
```

**SWR v2.x 实际签名：** `(error, key, config, revalidate, { retryCount })`

**后果：**
- `retryCount` 永远 `undefined` → `retryCount >= 5` 永远 `false` → 无限重试
- `revalidate` 是 config 对象 → `setTimeout(() => config({ retryCount }))` → TypeError

**修复：** 用具名参数 `(error, _key, _config, revalidate, opts)`，`retryCount` 从 `opts` 解构

**关联测试模板（来自 api-testing-strategy.md §4.4 错误处理测试）：**
- 应测试 SWR hook 在 API 调用失败时，5 次重试后 `isLoading: false` 且 `error` 已设置
- 应测试 `onErrorRetry` 在 `shouldRetry=false` 时不触发重试

---

## 三、路由/导航注册缺失

### ROUTE-001：自定义侧边栏面板缺少 UGS 条目

**位置：** `src/routes/(main)/home/_layout/Body/CustomizeSidebarModal.tsx:57-66`

**修复：** `ALL_SIDEBAR_ITEMS` 数组补充 `ugs-capabilities`、`ugs-skills`、`ugs-experts`

**关联测试（api-testing-strategy.md §7 合约测试）：**
- 应验证 `ALL_SIDEBAR_ITEMS` 包含所有 `DEFAULT_SIDEBAR_ITEMS` 中的 key

---

### ROUTE-002：CMDK 命令面板不收录 UGS 三页

**位置：** `packages/app-config/src/routes/index.ts:166-169`

**修复：** `getNavigableRoutes()` 过滤白名单追加 `'ugs-experts', 'ugs-capabilities', 'ugs-skills'`

---

## 四、交互三态缺失（P0/P1）

来自 `deliverables/gstack/functional-completeness-review-2026-06-18.md`

| ID | 页面 | 缺失 | 修复文件 |
|----|------|------|----------|
| UX-001 | UgsExperts | `useFetchAvailableAgents` 返回值丢弃，无 error 提示 | `index.tsx` — 新增 Alert 错误条 |
| UX-002 | UgsCapabilities | connectors 首屏加载无 Skeleton | `index.tsx` — `isConnectorsInit` 检查 |
| UX-003 | UgsSkills InstalledTab | `useFetchInstalledPlugins` 返回值丢弃 | `index.tsx` + `InstalledTab.tsx` — `pluginsLoading` prop |

**关联测试模板（api-testing-strategy.md §7.2 消费者契约）：**
- 应验证 SWR hook 返回的 `{ isLoading, error, data }` 三态被前端正确消费

---

## 五、架构层面问题

| ID | 严重度 | 说明 | 状态 |
|----|--------|------|------|
| ARCH-001 | 🔴 | AddSkillButton 跨 feature 依赖（UgsCapabilities → UgsSkills） | ✅ 已修复（移入 UgsShared） |
| ARCH-002 | 🔴 | `entry.desktop.tsx` 缺少 `BootErrorBoundary` | ✅ 已修复 |
| ARCH-003 | 🟡 | 两个 desktopRouter config 共 ~1900 行近重复代码 | ⏳ 待决策 |
| ARCH-004 | 🟡 | 三个 UGS Layout 为空壳 `<Outlet />` | ⏳ 待决策 |
| ARCH-005 | 🟡 | UGS feature 内缺少 fine-grained ErrorBoundary | ⏳ 待决策 |

---

## 六、数据/配置问题

| ID | 说明 | 状态 |
|----|------|------|
| DATA-001 | `presetMcps.ts` 硬编码用户路径 `C:\Users\shuai\...` | ⏳ 故障清单 |
| DATA-002 | `package.json` metadata 指向上游 LobeHub 仓库 | ✅ 已更新为 `Adair-Shuai/lobehub` |
| DATA-003 | `reportSkillEvent` 前端调用但后端无实现（`void payload`） | ⏳ 待后端支持 |
| DATA-004 | `chatGroupService` 三个方法（batchCreateAgentsInGroup / transferGroup / getGroupAgents）定义但无消费者 | ⏳ 供专家团后续复用 |
| DATA-005 | `DeferredStoreInitialization` 未预取 `installedPlugins` | ✅ 已修复 |

---

## 八、测试执行记录（2026-06-18 18:34）

### 已运行测试

| 测试文件 | 用例数 | 结果 | 耗时 |
|----------|--------|------|------|
| `src/utils/dayjsLocale.test.ts` | 5 | ✅ 全部通过 | 50s（含 setup） |
| `src/libs/swr/localDataCache.test.ts` | 8 | ✅ 全部通过 | 30s |
| `src/libs/swr/localStorageProvider.test.ts` | 11 | ✅ 全部通过 | 30s |
| `src/libs/swr/cacheProvider.integration.test.tsx` | 1 | ✅ 通过 | 48s |
| `src/libs/swr/cacheHydration.test.ts` | — | ⏳ 运行中（IndexedDB 操作耗时） | — |
| `src/spa/router/desktopRouter.sync.test.tsx` | — | ⏳ 运行中（解析 80+ 路由配置耗时） | — |

### 关键验证项

| 验证项 | 方法 | 结果 |
|--------|------|------|
| **dayjs locale 加载**（ERR-001 关联） | `normalizeDayjsLocale` + `loadDayjsLocaleModule` 5 个用例 | ✅ locale 别名映射正确，lazy/eager/browser 三种加载模式均正常 |
| **SWR 缓存基础架构**（SWR-001 关联） | `localDataCache` 8 用例 + `localStorageProvider` 11 用例 | ✅ 缓存读写/scope 隔离/TTL/Quota 降级全部通过 |
| **SWR 多 tier 缓存链**（关联 onErrorRetry 修复间接验证） | `cacheProvider.integration.test.tsx` 1 用例 | ✅ SWR + tiered provider + IndexedDB 持久化→重载链路正常 |
| **修改文件类型检查** | `bun run type-check` 过滤修改文件 | ⏳ 运行中 |
| **路由同步检查**（ROUTE-001/002 关联） | `desktopRouter.sync.test.tsx` | ⏳ 运行中 |

### 测试覆盖总结

- **已修复 bug 的直接测试**：SWR 缓存层（20 用例通过，验证了 `useClientDataSWR` 基础架构未受 onErrorRetry 修复影响）
- **上游预存测试**：约 350+ 测试文件，CI 自动运行
- **暂未覆盖但应补的测试**（来自 api-testing-strategy.md）：
  - TRPC market router 的 5 次重试后错误处理测试（§4.4 模式）
  - UGS 三页 loading/error 三态渲染测试（§7.2 消费者契约模式）
  - 路由配置 `ALL_SIDEBAR_ITEMS` 包含性测试（§7 合约测试）

---

## 九、关联文档索引

| 文档 | 路径 | 用途 |
|------|------|------|
| 功能完整性审查 | `deliverables/gstack/functional-completeness-review-2026-06-18.md` | 需求来源、评分矩阵 |
| API 测试策略 | `outputs/api-testing-strategy.md` | 测试模板、API 架构参考 |
| 架构断链报告 | `outputs/UGS_断链排查报告_2026-06-18.md` | 逐模块断链明细 |
| 踩坑记录 | `LESSONS_LEARNED.md` | INC-001~INC-005 |
| 项目架构 | `ARCHITECTURE.md` | 修改登记、模块约定 |
| 项目内存 | `.workbuddy/memory/2026-06-18.md` | 今日工作日志 |

| 文档 | 路径 | 用途 |
|------|------|------|
| 功能完整性审查 | `deliverables/gstack/functional-completeness-review-2026-06-18.md` | 需求来源、评分矩阵 |
| API 测试策略 | `outputs/api-testing-strategy.md` | 测试模板、API 架构参考 |
| 架构断链报告 | `outputs/UGS_断链排查报告_2026-06-18.md` | 逐模块断链明细 |
| 踩坑记录 | `LESSONS_LEARNED.md` | INC-001~INC-005 |
| 项目架构 | `ARCHITECTURE.md` | 修改登记、模块约定 |
| 项目内存 | `.workbuddy/memory/2026-06-18.md` | 今日工作日志 |
