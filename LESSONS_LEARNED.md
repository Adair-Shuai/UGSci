# UGSci 事故复盘与规避清单

> **本文件是血泪教训的积累。任何修改数据库、删除数据、给出操作建议之前，必须先查阅本文件，确认是否重蹈覆辙。**
>
> 规则：每条复盘记录「现象 → 错误建议 → 真实根因 → 正确做法 → 通用规则」。新增复盘追加到对应分类末尾，编号递增。

---

## 一、数据库操作类

### INC-001: 建议删除 agents 表记录触发级联删除（2026-06-18）

**现象**：ugs-* 专家点击进入对话后显示"自定义助理"，model/provider 为空。

**错误建议**（已撤回）：
```sql
-- ❌ 危险！会级联删除对话历史
DELETE FROM agents WHERE slug LIKE 'ugs-%';
```

**真实根因**：
- `agents` 表被 `topics`、`messages`、`agentsToSessions`、`agentsFiles`、`agentsKnowledgeBases`、`agentShares`、`agentBotProvider`、`agentCronJob`、`agentDocuments`、`chatGroupAgents`、`agentEvals` 等 11+ 张表通过外键引用
- **绝大多数外键是 `onDelete: 'cascade'`** —— 删 agent 会连带删除该 agent 的所有话题和消息
- 当时只看了 agent 创建逻辑（`getBuiltinAgent`），没查 schema 级联策略就给出 DELETE 建议

**正确做法**：
```sql
-- ✅ 安全：UPDATE 补字段，不触发级联
UPDATE agents
SET model = 'deepseek-v4-pro', provider = 'deepseek'
WHERE slug LIKE 'ugs-%'
  AND (model IS NULL OR provider IS NULL);
```
`getBuiltinAgent` 的逻辑是"找到就用，找不到才创建"，所以根本不需要删记录，UPDATE 即可。

**通用规则**：
1. **永远不要对 `agents` 表执行 DELETE**，除非明确要清空该 agent 的全部对话历史
2. 给出任何 SQL 建议（尤其是 DELETE/DROP/TRUNCATE）前，**必须先查 `packages/database/src/schemas/` 下相关表的外键级联策略**
3. 「补字段」永远用 UPDATE，不要「删了重建」
4. 对 `sessions`、`topics`、`messages`、`files` 等核心业务表同理 —— 先查级联，再动手
5. 操作前备份：`pg_dump -t <表名> > backup_<表名>_<日期>.sql`

**快速自查命令**：
```bash
# 查询某张表的所有外键引用关系（替换 <TABLE_NAME>）
grep -rn "references(() => <TABLE_NAME>.id" packages/database/src/schemas/
```

---

## 二、前端组件类

（暂无）

---

## 三、环境配置类

### INC-002: 假设 lucide-react 导出存在未运行时验证（2026-06-18）

**现象**：专家广场页面显示"页面不可用"（ErrorBoundary 兜底）。

**错误做法**：
```ts
// ❌ 凭直觉猜图标名，没验证导出是否存在
import { Tool } from 'lucide-react';  // Tool 实际不存在！
```

**真实根因**：
- lucide-react 用 `export *` 动态导出，TypeScript 无法静态检测具名导出不存在
- `typeof Tool === 'undefined'`，React 渲染 `<Tool />` 抛 "Element type is invalid"
- 被 `errorElement: <ErrorBoundary />` 捕获，显示"页面不可用"

**正确做法**：
```ts
// ✅ 先验证导出存在
node -e "const l = require('lucide-react'); console.log(typeof l.Tool)"
// 输出 undefined → 改用 Wrench
```

**通用规则**：
1. 从第三方库导入具名导出时，**不要凭直觉猜名字**，先用 `node -e` 验证
2. 图标库尤其注意：`Tool`→`Wrench`、`Tools`→不存在、`ToolIcon`→`Wrench`
3. 遇到"页面不可用"先查浏览器控制台的运行时错误，不要急着改路由

---

## 四、架构理解类

### INC-003: 误判侧边栏菜单顺序的修改位置（2026-06-18）

**现象**：用户要求把菜单顺序改为「能力→技能→专家」。

**错误做法**：第一次只改了 `src/hooks/useNavLayout.ts` 的 `topNavItems` 数组顺序，认为已完成。

**真实根因**：
- `topNavItems` / `bottomMenuItems` 只是**数据源**，被 `Body/index.tsx` 合并成 `Map<key, NavItem>`（按 key 索引，丢弃顺序）
- 真正的视觉顺序由 `sidebarItems`（全局 store 持久化字段）决定
- 默认值 = `DEFAULT_SIDEBAR_ITEMS`（`src/store/global/selectors/systemStatus.ts:69`）

**正确做法**：改 `DEFAULT_SIDEBAR_ITEMS` 数组顺序。

**通用规则**：
1. 修改任何"顺序/可见性"问题前，先追踪**数据流**：数据从哪定义 → 经过哪些转换 → 最终在哪里渲染
2. 不要看到数组就以为改它顺序就够了 —— 中间可能有 Map 转换、排序、过滤
3. LobeHub 侧边栏顺序机制：`DEFAULT_SIDEBAR_ITEMS`（默认）→ `sidebarItems`（持久化覆盖）→ `Body` 按 `sidebarItems` 顺序渲染

---

### INC-004: ProductLogo 在 UGSci 品牌下渲染空图（2026-06-18）

**现象**：onboarding 欢迎页、auth 登录页、share 分享页、settings 关于页等多处 Logo 不显示。

**错误做法**：第一次发现 onboarding 欢迎页（TelemetryStep）Logo 不显示时，只把该文件里的 `<ProductLogo />` 手动替换成 `<UGSciLogo />`，逐个文件打地鼠。后续用户陆续发现 step=2、/onboarding/agent、desktop-onboarding 等处同样不显示 —— 同一个根因，反复修了三次。

**真实根因**：
- `ProductLogo` 在 `isCustomBranding=true`（UGSci 的情况）时走 `CustomLogo`（`src/components/Branding/ProductLogo/Custom.tsx`）
- `CustomLogo` 的所有分支（无 type / `3d` / `flat` / `mono` / `combine`）都用 `CustomImageLogo`，其 `src={BRANDING_LOGO_URL}`
- UGSci 品牌配置里 `BRANDING_LOGO_URL=''`（空字符串），所以渲染空图
- 只有 `type='text'` 分支用 `CustomTextLogo`（纯文字）才正常
- 全项目 ~15 处 `<ProductLogo />` 调用，大部分没传 `type='text'`，全部受影响

**正确做法**：从 `CustomLogo` 源头修复 —— 模块加载时求值 `const hasLogoUrl = !!BRANDING_LOGO_URL`，当为 false 时所有分支统一 fallback 到 `UGSciLogo`（两色文字 logo）。一处修复覆盖全项目，新代码用 `<ProductLogo size={n} />` 无论传不传 type 都安全。

**通用规则**：
1. 遇到"某组件在某配置下渲染空/崩溃"的问题，先排查是否是**品牌/环境配置**导致的分支差异，而不是逐个文件修
2. 修复品牌级问题必须从**组件源头**修，不要在调用点打地鼠 —— 同一根因会出现在 N 个调用点
3. UGSci 品牌的 Logo 统一入口是 `<ProductLogo />`（`src/components/Branding/ProductLogo/`），其内部 fallback 到 `UGSciLogo`；新代码直接用 `<ProductLogo size={n} />`，**不需要也不应该**手动选 UGSciLogo vs ProductLogo
4. 如果新增品牌配置项（如 logo URL），必须考虑"配置值为空"的兜底，否则所有依赖该配置的渲染分支都会空

---

## 四、前端基础设施类

### INC-005: useClientDataSWR 的 onErrorRetry 参数索引错误导致详情页无限加载（2026-06-18）

**现象**：技能市场、能力市场等社区页面的详情页点击后一直显示 loading，永远加载不出来。

**错误代码**（`src/libs/swr/index.ts`）：
```ts
// ❌ args[2] 是 SWR config 对象，不是 revalidate 函数
// ❌ args[3] 是 revalidate 函数，不是 { retryCount } 对象
onErrorRetry: (error: any, ...args: any[]) => {
  const revalidate = args[2];       // ← 实际取到 config 对象
  const { retryCount } = args[3];   // ← 从函数取 retryCount → undefined
  ...
  setTimeout(() => revalidate({ retryCount }), timeout);
  // ↑ revalidate 是 config 对象，调用报 TypeError
}
```

**真实根因**：
- SWR v2.x 的 `onErrorRetry` 回调签名是 `(error, key, config, revalidate, opts)` —— 共 5 个参数
- 代码使用 `...args` 展开，错误地将 `args[2]`（config 对象）当作 `revalidate` 函数
- 导致：① `retryCount` 永远为 `undefined`，`retryCount >= 5` 永远 false，无限重试；② `setTimeout` 回调里调用 config 对象报 TypeError
- 最终：SWR 永远无法完成重试或进入错误状态，`isLoading` 永远 `true`，页面永远 loading

**正确做法**：
```ts
// ✅ 用具名参数，明确 SWR v2.x 签名
// SWR v2.x callback: (error, key, config, revalidate, { retryCount })
onErrorRetry: (error: any, _key: any, _config: any, revalidate: any, opts: any) => {
  const { retryCount } = opts;
  ...
  setTimeout(() => revalidate({ retryCount }), timeout);
}
```

**通用规则**：
1. **永远不要用 `...args` + 数字索引访问回调参数**，尤其是参数数量超过 3 个的回调。用具名参数。
2. 遇到"页面永远 loading"的 bug，优先排查 SWR `onErrorRetry` 是否被错误实现
3. 第三方库的回调签名可能随版本变化。查看 node_modules 中的 `.d.ts` 或 `.d.mts` 确认参数顺序
4. 修改核心基础设施（如 SWR wrapper）后，需验证所有使用该基础设施的页面是否正常工作
5. 此 bug 影响所有使用 `useClientDataSWR` 且首次 fetch 失败的页面（list 页面可能因首次成功 + 缓存而幸存，但 detail 页面首次访问必触发）

**验证命令**（在 SWR 安装目录确认签名）：
```bash
grep -A 5 "onErrorRetry" node_modules/swr/dist/_internal/types.d.mts
```

---

## 五、桌面端打包构建类

### INC-006: bun install 不执行 electron postinstall，Electron 二进制缺失（2026-06-18）

**现象**：`electron-vite dev` 启动时报 `Error: Electron uninstall`，无 Electron 窗口弹出。

**真实根因**：
- `electron` npm 包的 postinstall 脚本（`install.js`）负责下载 ~130MB 的 Electron 二进制到 `node_modules/electron/dist/`
- bun 在某些情况下**不执行** postinstall 脚本，导致 `dist/` 目录为空
- electron-vite 找不到 `electron.exe`，报 `Electron uninstall` 错误

**正确做法**：
```bash
# 手动执行 electron 的安装脚本
cd apps/desktop && node node_modules/electron/install.js
```

**通用规则**：
1. `bun install` 后务必检查原生依赖的 postinstall 是否正常执行
2. 验证 `node_modules/electron/dist/electron.exe` 是否存在
3. pnpm 的 postinstall 更可靠（electron-builder 的 `postinstall: electron-builder install-app-deps` 也需要检查）

---

### INC-007: ELECTRON_RUN_AS_NODE 环境变量泄漏导致 Electron 以纯 Node.js 模式运行（2026-06-18）

**现象**：Electron 窗口不弹出，`dist/main/index.js` 报 `TypeError: Cannot read properties of undefined (reading 'setName')`。`require('electron')` 返回 `undefined` 而非 Electron API 模块。

**真实根因**：
- WorkBuddy 自身是 Electron 应用，启动 CLI 子进程（`codebuddy`）时设置 `ELECTRON_RUN_AS_NODE=1`，使 Electron 作为纯 Node.js 运行时使用
- 该环境变量**泄漏到 Bash shell 会话**中，导致用户启动的任何 `electron.exe` 都被当作 `node.exe`
- 在 `ELECTRON_RUN_AS_NODE=1` 模式下，`require('electron')` 无法找到内置模块，返回 `undefined`

**诊断命令**：
```bash
echo $ELECTRON_RUN_AS_NODE  # 若输出 1，说明被泄漏
electron.exe --version      # 应输出 v41.3.0，若输出 v24.15.0 则确认问题
```

**正确做法**：
```bash
unset ELECTRON_RUN_AS_NODE && electron.exe --version  # 验证恢复正常
# 后续启动命令都需 unset
unset ELECTRON_RUN_AS_NODE && bun run dev
```

**通用规则**：
1. 在 Electron 环境中运行其他 Electron 应用时，务必检查 `ELECTRON_RUN_AS_NODE`
2. 建议在 `.bashrc` 中显式 `unset ELECTRON_RUN_AS_NODE` 或创建别名

---

### INC-008: VS2022 BuildTools 的 state=0xFFFFFFFF 被 node-gyp 拒绝（2026-06-18）

**现象**：electron-builder 在 `@electron/rebuild` 步骤报 `Could not find any Visual Studio installation to use`，但 VS2022 BuildTools 确已安装。

**真实根因**：
- VS2022 BuildTools 通过 `vswhere.exe` 查询时，`state` 属性返回 `4294967295`（`0xFFFFFFFF`，即 DWORD `-1`）
- node-gyp v10.3.1 和 v11.2.0 的 `VisualStudioFinder` 无法解析 `state=-1`，认为安装无效
- `VSCMD_VER` 环境变量未设置时，node-gyp 也无法获取版本信息，报 `unknown version "undefined"`

**正确做法**：
```bash
# 设置 node-gyp 所需的 MSVC 环境变量
export VCINSTALLDIR="C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC"
export VSINSTALLDIR="C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools"
export VSCMD_VER="17.14.36930.0"  # 从 vswhere 获取
export WindowsSDKVersion="10.0.26100.0\\"
export PATH="/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.44.35207/bin/Hostx64/x64:$PATH"
npx node-gyp rebuild --target=41.3.0 --arch=x64 --dist-url=https://electronjs.org/headers
```

**获取 MSVC 版本号的命令**：
```bash
"/c/Program Files (x86)/Microsoft Visual Studio/Installer/vswhere.exe" -products "Microsoft.VisualStudio.Product.BuildTools" -property installationVersion
```

**通用规则**：
1. VS BuildTools SKU 的 `state` 值可能不被 node-gyp 识别，需手动设 `VSCMD_VER`
2. 运行 `@electron/rebuild` 前，确保 `VSCMD_VER`、`VCINSTALLDIR`、`VSINSTALLDIR` 均已设置
3. 遇到 node-gyp VS 检测失败时，先检查 `vswhere` 输出，确认 `state` 和 `installationVersion`

---

### INC-009: electron-builder 打包过程中的三个兼容性问题（2026-06-18）

**现象**：electron-builder 打包 Windows 安装包时连续遇到三个错误。

**子问题 1 — `@electron/rebuild` 找不到 node-gyp v11 的 VS**
- 错误：`Could not find any Visual Studio installation to use`（与 INC-008 同根因）
- 修复：预编译 `get-windows` 原生模块（手动 node-gyp rebuild），让 `@electron/rebuild` 检测到已编译跳过

**子问题 2 — `@electron/get` v3+ 移除了 `ElectronDownloadCacheMode` 枚举**
- 错误：`Cannot read properties of undefined (reading 'ReadWrite')` at `electronGet.ts:130`
- 根因：`app-builder-lib@26.14.0` 依赖 `@electron/get` 的 `ElectronDownloadCacheMode.ReadWrite`，但新版 `@electron/get`（v3+）移除了该枚举
- 修复：在 `node_modules/.pnpm/app-builder-lib@26.14.0_.../out/util/electronGet.js` 中硬编码 `resolveCacheMode()` 返回 `0`

**子问题 3 — Windows 上 `fs.rename` 重命名目录时 EPERM**
- 错误：`EPERM: operation not permitted, rename '.../win-unpacked.tmp' -> '.../win-unpacked'`
- 根因：Windows NTFS 在 `fs.rm(dir, {recursive: true})` 后，文件句柄未立即释放，立即 `fs.rename` 触发权限错误（竞态条件）
- 尝试的修复：添加重试循环（`for (let retry = 0; retry < 5; retry++)`），但问题持续
- 替代方案：使用 `--dir` 参数并指定 `electronDist` 直接引用本地 Electron 二进制

**通用规则**：
1. 打包 Windows 前，先清理 `release/` 目录：`rm -rf release/`
2. 若 `@electron/rebuild` 持续失败，考虑手动编译原生模块后再打包
3. electron-builder + pnpm workspace 的组合在 Windows 上稳定性较差，建议：
   - 优先使用 `--dir` 生成解压目录（跳过 NSIS 打包）
   - Native 模块在打包前手动编译
   - 打包前确保 `ELECTRON_RUN_AS_NODE` 已 unset

---

## 六、复盘检查清单（解决问题前必读）

每次遇到问题准备给方案前，过一遍这个清单：

### 数据库操作
- [ ] 是否涉及 DELETE/DROP/TRUNCATE？→ **先查 `packages/database/src/schemas/` 的外键级联策略**
- [ ] 是否能用 UPDATE 替代 DELETE？→ **优先 UPDATE**
- [ ] 是否已备份相关表？→ `pg_dump -t <表> > backup.sql`
- [ ] 是否查过本文件 INC-001？

### 第三方依赖导入
- [ ] 具名导出是否经过验证？→ `node -e "const l = require('lib'); console.log(typeof l.X)"`
- [ ] 是否查过本文件 INC-002？

### UI 顺序/可见性
- [ ] 是否追踪了完整数据流（定义→转换→渲染）？
- [ ] 是否有中间 Map/排序/过滤破坏了数组顺序？
- [ ] 是否查过本文件 INC-003？

### 品牌组件 / Logo 渲染
- [ ] Logo 不显示？→ 先查 `BRANDING_LOGO_URL` 是否为空，而非逐个文件替换
- [ ] 是否从组件源头修（`CustomLogo` fallback），而非调用点打地鼠？
- [ ] 是否查过本文件 INC-004？

### 运行时崩溃
- [ ] 是否先看了浏览器控制台错误，而不是急着改代码？
- [ ] 错误是否被 ErrorBoundary 兜底（显示"页面不可用"）？

### SWR / 数据加载
- [ ] "永远 loading"是否可能由 `onErrorRetry` 参数索引错误导致？
- [ ] 是否使用了 `...args` + 数字索引而不是具名参数？
- [ ] 是否查过本文件 INC-005？

### 给用户的操作建议
- [ ] DELETE/DROP 类建议是否标注了风险？
- [ ] 是否提供了安全替代方案（UPDATE/备份）？
- [ ] 是否说明了对已有数据的影响？

---

## 维护说明

- **新增复盘**：在对应分类末尾追加，编号递增（INC-004, INC-005...）
- **分类新增**：在「维护说明」前插入新的 `## N、XXX类` 章节
- **检查清单更新**：每次新增复盘后，同步更新「复盘检查清单」
- **查阅时机**：
  - 给出数据库操作建议前
  - 导入第三方库具名导出前
  - 修改 UI 顺序/可见性前
  - 涉及品牌组件/Logo 渲染时
  - 遇到运行时崩溃时
  - 任何"我觉得应该这样改"的直觉判断前
