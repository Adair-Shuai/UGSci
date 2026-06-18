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

### INC-010: pnpm list 在 Windows 上 EMFILE 句柄耗尽（2026-06-18）

**现象**：electron-builder 26 在 `searching for node modules` 阶段报 `Node module collector process exited with code 4294963230`，pnpm 子进程返回 `{"error":{"code":"EMFILE","message":"EMFILE: too many open files"}}`。

**真实根因**：
- Windows 单进程文件句柄上限 ~3200（Git Bash 报 `ulimit -n 3200`，且 `ulimit -n 16384` 报 "Operation not permitted"）
- pnpm 10 默认行为：18 个 workspace + 1100+ 顶层 modules + `--depth Infinity` 全量扫描 node_modules，远超句柄上限
- `pnpm install` 报 `ERR_PNPM_IGNORED_BUILDS` 也根因相同——exit 1 中断，symlink 状态被打乱（`node_modules/@napi-rs/canvas` 等被删后未补回）

**正确做法**：
1. **首选修复**：把 `app-builder-lib/out/node-module-collector/index.js` 的 `getCollectorByPackageManager` 让 `PM.PNPM` 走 `TraversalNodeModulesCollector`（内置文件遍历，零子进程）。这是 electron-builder 内置的 fallback 路径
2. **配套修复**：改 `traversalNodeModulesCollector.js` 的 `buildPackage` prodDeps 回调，throw 改为 warn + 记 `PKG_NOT_FOUND` logSummary（不要中断 flow）
3. **配套修复**：`pnpm-workspace.yaml` 的 `onlyBuiltDependencies` 必须列出所有 build script（`electron-winstaller`/`get-windows`/`electron`/`esbuild`/`electron-builder`），否则 pnpm 10 阻断 build script 报 exit 1

**通用规则**：
1. **永远不要在 Windows 上用 pnpm 10 + 18 workspace + electron-builder 26 原生组合**——必然 EMFILE
2. 调 ulimit 在 Windows Git Bash 无效（操作不允许）
3. 优先使用 `TraversalNodeModulesCollector`（appFileCopier.js 的 `pmApproaches[1]` 就是这个），它扫描 fs 不调子进程
4. TRAVERSAL 的"找不到 production dep"应当 warn 而非 throw，否则单点失败让整个 pack 失败

### INC-011: pnpm 别名包 (strip-ansi-cjs) 导致 asar 缺依赖（2026-06-18）

**现象**：LobeHub.exe 启动后报 `Cannot find module 'strip-ansi'`，报错栈：`gauge/wide-truncate.js` → `string-width/index.js` → `string-width-cjs/index.js` → `wrap-ansi-cjs/index.js` 都需要 `strip-ansi`，但 asar 只有 `strip-ansi-cjs`（pnpm 别名）。

**根因**：
- `@isaacs/cliui@8.0.2` 通过 pnpm 字段同时声明 `"strip-ansi": "^7.0.1"` 和 `"strip-ansi-cjs": "npm:strip-ansi@^6.0.1"`，是双发布
- pnpm 在 `.pnpm/@isaacs+cliui@8.0.2/node_modules/` 下建立两个 symlink：`strip-ansi -> strip-ansi@7.2.0`、`strip-ansi-cjs -> strip-ansi@6.0.1`
- electron-builder 的文件 glob `node_modules/{name}/**` 用 symlink 的**链接名**（strip-ansi-cjs）作为目录名放入 asar
- 但 `gauge/wide-truncate.js` 等老模块的 `require('strip-ansi')` 走 Node 默认解析：先看自身 `node_modules/strip-ansi`，找不到则向上
- 这些老模块依赖的是 `string-width@4.2.3` + `strip-ansi@^6.0.1`（pnpm 把它解析到 `strip-ansi@6.0.1`）——所以 pnpm 预期 `string-width@4.2.3/node_modules/strip-ansi` 能解析
- 然而 TRAVERSAL collector 把 pnpm 别名 "strip-ansi-cjs" 当作目录名收集，gauge 看不到真正的 "strip-ansi" 目录

**正确做法（按优先级）**：
1. **最佳方案**：在 `node_modules/strip-ansi`（**真实目录**而非 symlink）放一份 `strip-ansi@6.0.1` 的内容
   ```bash
   node -e "
   const fs = require('fs'), path = require('path');
   function copyDir(s, d) {
     fs.mkdirSync(d, { recursive: true });
     for (const e of fs.readdirSync(s, { withFileTypes: true })) {
       const sp = path.join(s, e.name), dp = path.join(d, e.name);
       if (e.isDirectory()) copyDir(sp, dp);
       else fs.copyFileSync(sp, dp);
     }
   }
   copyDir('node_modules/.pnpm/strip-ansi@6.0.1/node_modules/strip-ansi', 'node_modules/strip-ansi');
   // 同样处理 ansi-regex
   copyDir('node_modules/.pnpm/ansi-regex@5.0.1/node_modules/ansi-regex', 'node_modules/ansi-regex');
   "
   ```
2. **原因**：electron-builder 的 file glob `**/*` 从 `node_modules/strip-ansi` 收集时，会把真实目录下的内容正确放入 asar 的 `node_modules/strip-ansi/`
3. **同理**：`@isaacs/cliui` 用的 `wrap-ansi-cjs` 在 asar 中已有 `wrap-ansi` 目录（因为 `wrap-ansi@7.0.0` 自身），但 `wrap-ansi-cjs/index.js` 内部 `require('strip-ansi')` 也走真名解析——所以补 strip-ansi 后 wrap-ansi-cjs 也活了
4. **不要用 symlink**：用 symlink (junction) 收集时 electron-builder 仍会 resolve 到 .pnpm/ 真实路径，命名按 symlink 名（即"strip-ansi-cjs"）——**必须是真实目录副本**

**衍生坑**：把 `node_modules/strip-ansi` 设为 symlink 不会生效，因 electron-builder 的 `ModuleCopier` 跟踪 symlink 时会按链接名命名。

### INC-012: Windows 残留 app.asar 文件锁导致无法覆盖（2026-06-18）

**现象**：尝试删除 `release/win-unpacked/resources/app.asar`（或 mv、重命名、cmd del、PS Remove-Item -Force）都失败，错误 `EBUSY` 或 `EPERM`，即使等 5 分钟也无效。最终 `rm -rf release/` 都失败。

**根因**：Windows Search Indexer (`SearchIndexer.exe`)、MpDefenderCoreService、AV scan 持有文件句柄。Git Bash `rm` 和 cmd `del` 都无法强制回收。

**解决**：
1. **不删，直接写到新目录**：用 `-c.directories.output=release_new` 让 electron-builder 输出到新目录
2. **拷贝到最终位置**：`node fs.copyDir()` 整个 `release_new/win-unpacked` 到项目根 `win-unpacked-fixed/`
3. **废弃旧 release/**：保留为废文件不删，下一次构建会复用同名目录
4. **下次预防**：打包前 `net stop "Windows Search"` 或禁用 Windows Defender 实时保护后再打包

**通用规则**：
1. **Windows 上发布后不要反复打包到同一目录**——每次失败都可能留下锁。改用时间戳目录
2. **不要尝试 unlink EBUSY 文件**——会永远卡住。直接写到新目录

### INC-013: package.json name 未同步导致 IPC pipe EADDRINUSE（2026-06-18）

**现象**：Electron 启动后主进程 `ElectronIPCServer.start()` 报 `EADDRINUSE: address already in use \\.\pipe\lobehub-desktop-dev-electron-ipc`。主进程 bootstrap 中断，splash 页无限转圈。

**根因**：
- IPC pipe 名称由 `packages/electron-server-ipc/src/const.ts:5` 生成：`\\.\pipe\{appId}-electron-ipc`
- `appId` 来源于 `App.ts:10`：`import { name } from '@/../../package.json'` —— 即 `package.json` 的 `"name"` 字段
- 品牌改名时修改了 `pre-app-init.ts` 的 `app.setName()`，但忘记改 `package.json` 的 `"name"`
- 旧 pipe 名 `lobehub-desktop-dev-electron-ipc` 与之前残留进程冲突

**修复**：`apps/desktop/package.json` 的 `"name"` 从 `"lobehub-desktop-dev"` 改为 `"ugsci-desktop-dev"`

**通用规则**：
1. `package.json#name` 不只是包名——在 Electron 中决定 IPC pipe、userData 路径、协议 scheme 等多个底层标识
2. 品牌改名时的同步检查清单见 `docs/desktop-packaging-guide.md` 第五节

### INC-014: 打包残留目录触发 Vite HMR 无限 page reload（2026-06-18）

**现象**：electron-vite dev 模式下，Vite 客户端频繁触发 `page reload`，日志显示 `LICENSES.chromium.html` 等文件变化。每次 reload 重新请求上百个模块，叠加 ECONNRESET 导致 SPA 永远无法完成初始化。

**根因**：
- 多次 electron-builder 打包尝试在 `apps/desktop/` 下创建了 `build/`、`LobeHub/`、`desktop_v2/`、`release/` 等目录
- Vite dev server 的文件监听器默认监听项目所有文件变化
- electron-builder 提取的 Chromium license、资源文件等被 Vite 误判为源码变更，触发 HMR

**修复**：
1. 清理所有打包残留目录：`rm -rf apps/desktop/{build,release,LobeHub,desktop_v2}`
2. 在 `apps/desktop/.gitignore` 中忽略这些目录

**通用规则**：
1. electron-builder 的输出目录必须加入 `.gitignore` 和 Vite `server.watch.ignored`
2. 打包和开发不应在同一工作目录进行
3. 遇到 Vite 频繁 reload 时，先检查是否有非源码目录被文件监听器捕获

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
