# UGSci 桌面端 Windows 打包经验总结

> 本文档是 2026-06-18 一次完整打包的复盘，把踩过的 6 个大坑（INC-006 ~ INC-012）按时间线整理。
> 后续打包请直接跑 `node scripts/build-desktop.mjs`，本脚本已封装全部经验。

---

## TL;DR

```bash
# 一次命令搞定
cd apps/desktop
node scripts/build-desktop.mjs
```

产物在 `apps/desktop/build/desktop/LobeHub.exe`（约 213MB，目录总计 ~645MB），双击即可运行。

如果想出安装程序（NSIS `.exe` 安装器）：
```bash
node scripts/build-desktop.mjs --nsis
```

---

## 6 阶段流水线

| 阶段 | 任务 | 时间 | 失败坑 |
|------|------|------|--------|
| 1. env-check | 检查/补齐 Electron 二进制、native 模块 | ~30s | INC-006 |
| 2. prepare | 把 symlink 还原成真实目录（防 INC-011） | ~10s | INC-011 |
| 3. build-main | 跑 `electron-vite build` 生成 dist/ | ~90s | pnpm install postinstall 阻断 |
| 4. builder | 跑 `electron-builder --dir` 到隔离目录 | ~120s | INC-009/010/012 |
| 5. commit | 把隔离目录搬到最终位置 | <1s | - |
| 6. verify | 校验关键模块在 asar 中、native .node 在 unpacked | ~5s | - |

---

## 6 大坑的来龙去脉

### 坑 1: Electron 二进制缺失（INC-006）

**现象**：
```
Error: Electron uninstall
```
`node_modules/electron/dist/electron.exe` 不存在。

**根因**：
- electron 的 npm 包有个 `postinstall: install.js`，会从 GitHub 下载 ~130MB 的 Electron 二进制到 `dist/`
- `bun install` 在某些版本不执行 postinstall
- pnpm 10 对 postinstall 的管控更严（必须 `onlyBuiltDependencies` 列名）

**脚本里的处理**：
```js
if (!fileExists(electronExe)) {
  run('node node_modules/electron/install.js');
}
```

**预防**：
- `pnpm-workspace.yaml` 的 `onlyBuiltDependencies` 必须包含 `electron`
- 每次跑 `pnpm install` 后验证 `electron/dist/electron.exe` 存在

---

### 坑 2: pnpm install 阻断 postinstall（衍生坑）

**现象**：
```
ERR_PNPM_IGNORED_BUILDS  Build scripts are ignored because dependencies were built for a different OS
```
`pnpm run build:main` 退出码 1，dist/ 没生成。

**根因**：
- pnpm 10 默认禁止未经授权的 build script
- `apps/desktop/package.json` 的 `postinstall: electron-builder install-app-deps` 被阻断
- electron@41.3.0 平台未在 `onlyBuiltDependencies` 中显式列出

**脚本里的处理**：
- **不用 `pnpm run`**！直接 `node node_modules/electron-vite/bin/electron-vite.js build`
- 依赖已经安装好了（虽然在 `package.json` 的 `postinstall` 之后没真正完成），但 Vite build 本身不需要

**预防**：
- 在 `pnpm-workspace.yaml` 的 `onlyBuiltDependencies` 列出 `electron` 的具体版本
- 或者在脚本里直接绕开 `pnpm` 调用本地 bin

---

### 坑 3: @electron/rebuild 找不到 VS（INC-008）

**现象**：
```
Could not find any Visual Studio installation to use
```

**根因**：
- VS2022 BuildTools 通过 `vswhere` 查询时 `state=-1`（DWORD 无符号 0xFFFFFFFF）
- node-gyp v10/v11 的 VisualStudioFinder 拒绝 state=-1

**脚本里的处理**：
- **不跑 @electron/rebuild**！
- 改为：让原生模块用 **NAPI 9 预编译**（`get-windows` 自带 `lib/binding/napi-9-win32-unknown-x64/node-get-windows.node`）
- NAPI 9 的 ABI 在所有 Node 版本和 Electron 41 上通用，**不需要重新编译**

**预防**：
- 永远不要在 Windows 上跑 `@electron/rebuild`——VS 检测几乎一定失败
- 改用预编译二进制（绝大多数 native 模块都提供了 NAPI 预编译）

---

### 坑 4: EPERM 重命名 win-unpacked（INC-009 子问题 3）

**现象**：
```
EPERM: operation not permitted, rename '.../win-unpacked.tmp' -> '.../win-unpacked'
```

**根因**：
- `app-builder-lib` 流程：下载 zip → 解压到 `win-unpacked.tmp` → rename 成 `win-unpacked`
- Windows NTFS 在文件刚被创建时，AV scan / Search Indexer 立即建索引
- rename 触发 EPERM（操作不允许）

**脚本里的处理**：
```js
-c.electronDist="...node_modules/electron/dist"
```
让 electron-builder 直接用本地 Electron 二进制，**跳过下载+解压+rename** 整个流程。

**预防**：
- 永远用 `-c.electronDist` 指向本地 dist
- 不要让 electron-builder 自己下载

---

### 坑 5: pnpm 10 EMFILE 句柄耗尽（INC-010）

**现象**：
```
Node module collector process exited with code 4294963230
EMFILE: too many open files
```

**根因**：
- electron-builder 26 默认调 `pnpm list --depth Infinity` 扫依赖
- 18 个 workspace × 1100+ 顶层 modules = 远超 Windows 单进程 3200 句柄上限
- `ulimit -n` 在 Windows Git Bash 报 "Operation not permitted"，无法调高

**正确做法**：
- 改 `app-builder-lib` 源码，让 PNPM 走 `TraversalNodeModulesCollector`（内置文件遍历，零子进程）
- 改 `traversalNodeModulesCollector.js` 让"找不到 production dep"时 warn 而非 throw

**脚本里的处理**：
- 依赖 INC-009 子问题 1 的修复（项目里之前已打过补丁）
- 如果补丁丢失，可以重打：
  - `node_modules/.pnpm/app-builder-lib@26.14.0_*/node_modules/app-builder-lib/out/node-module-collector/index.js` 中 `getCollectorByPackageManager(pm, ...)` 改为 `case packageManager_1.PM.PNPM: return new traversalNodeModulesCollector_1.TraversalNodeModulesCollector(...)`
  - `node_modules/.pnpm/app-builder-lib@26.14.0_*/node_modules/app-builder-lib/out/node-module-collector/traversalNodeModulesCollector.js` 中 `buildPackage` 的 prodDeps 回调从 throw 改为 warn

---

### 坑 6: pnpm 别名包导致 asar 缺依赖（INC-011）

**现象**：
```
Uncaught Exception: Cannot find module 'strip-ansi'
Require stack:
- gauge/wide-truncate.js
- string-width/index.js
- string-width-cjs/index.js
- wrap-ansi-cjs/index.js
- ...
```

**根因（最容易被忽略）**：
- `@isaacs/cliui@8.0.2` 在 `package.json` 同时声明：
  ```json
  "strip-ansi": "^7.0.1",
  "strip-ansi-cjs": "npm:strip-ansi@^6.0.1"
  ```
- pnpm 在 `node_modules/.pnpm/@isaacs+cliui@8.0.2/node_modules/` 下建两个 symlink：
  - `strip-ansi -> .pnpm/strip-ansi@7.2.0/...`
  - `strip-ansi-cjs -> .pnpm/strip-ansi@6.0.1/...`
- electron-builder 的文件 glob `node_modules/{name}/**` 用 **symlink 的链接名** 收集
- TRAVERSAL collector 把 `strip-ansi-cjs` 当目录名放进 asar
- 但 `gauge/wide-truncate.js` 等老模块的 `require('strip-ansi')` 找的是真名 "strip-ansi"，找不到

**正确做法**：
- 在 `node_modules/strip-ansi` 放一份 **真实目录**（不是 symlink），内容是 `strip-ansi@6.0.1`
- electron-builder 收集时按目录名"strip-ansi"放进 asar ✓
- 同样处理 `wrap-ansi`、`ansi-regex`、`string-width`

**为什么不能用 symlink？**
- symlink 会被 electron-builder 的 `ModuleCopier` resolve 到 `.pnpm/`，命名按链接名（即 "strip-ansi-cjs"）
- **必须真实目录副本**

**脚本里的处理**（step 2）：
```js
const targets = [
  { name: 'strip-ansi', src: 'strip-ansi@6.0.1' },
  { name: 'wrap-ansi', src: 'wrap-ansi@7.0.0' },
  { name: 'ansi-regex', src: 'ansi-regex@5.0.1' },
  { name: 'string-width', src: 'string-width@4.2.3' },
];
// 用 copyDir() 复制真实目录到 node_modules 顶层
```

**预防**：
- 任何用 pnpm alias 的依赖（`"X-cjs": "npm:X"`）都需要这个处理
- 也包含在 `electron-builder.mjs` 的 `files` 列表中（已加注释）

---

## 隐藏坑 7: Windows 残留文件锁（INC-012）

**现象**：
- 第一次跑 `electron-builder` 成功，得到 `release/win-unpacked/`
- 第二次跑想覆盖，`rm -rf release/` 失败：`EBUSY`
- 等 5 分钟、`cmd del /F`、`PS Remove-Item -Force` 都失败

**根因**：
- Windows Search Indexer (`SearchIndexer.exe`) / MpDefenderCoreService 持有 `app.asar` 句柄
- Git Bash `rm` 和 `cmd del` 都无法强制回收
- 即使进程释放，句柄缓存可能持续数分钟

**正确做法**：
- **不要删，直接写到新目录**：`electron-builder -c.directories.output=<新目录>`
- 每次构建用时间戳目录，搬运到最终位置后保留旧版本作为回滚

**脚本里的处理**（step 4-5）：
```js
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const builderOut = `build/desktop__building-${stamp}`;
// ...electron-builder 输出到 builderOut
// ...构建成功后 rename 到 build/desktop
```

**预防**：
- 打包前：`net stop "Windows Search"` （需要管理员）
- 或：在 Windows Defender 排除列表中加入 `apps/desktop/release/` 和 `apps/desktop/build/`
- 或：使用脚本的"隔离输出"模式（默认行为）

---

## 快速自检清单

跑完脚本后必须人工确认：

- [ ] `build/desktop/LobeHub.exe` 存在且 ~213MB
- [ ] `build/desktop/resources/app.asar` 存在且 ~225MB
- [ ] `build/desktop/resources/app.asar.unpacked/node_modules/` 至少 4 个 .node 二进制
- [ ] 双击 LobeHub.exe，能正常启动（窗口出现）
- [ ] **不** 报 `Cannot find module 'strip-ansi'`
- [ ] **不** 报 `Cannot find module 'get-windows'`（缺 native module）

如果报 `Cannot find module 'X'`：
1. 看错误堆栈第一个文件
2. 用 `node node_modules/@electron/asar/bin/asar.js list build/desktop/resources/app.asar | grep node_modules/X` 检查是否在 asar
3. 如果不在，把它加到脚本 step 2 的 `targets` 列表中

---

## 调试技巧

### 1. 解包 asar 看内容
```bash
node -e "
const {extractAll} = require('./node_modules/@electron/asar');
extractAll('build/desktop/resources/app.asar', 'C:/Users/shuai/AppData/Local/Temp/asar-debug');
"
# 然后在 C:/Users/shuai/AppData/Local/Temp/asar-debug/ 翻看
```

### 2. 看一个 .node 模块是否在 unpacked
```bash
node -e "
const fs = require('fs'); const path = require('path');
function w(d) { let r=[]; for (const e of fs.readdirSync(d, {withFileTypes:true})) {
  const p = path.join(d, e.name);
  if (e.isDirectory()) r = r.concat(w(p));
  else if (e.name.endsWith('.node')) r.push(p);
} return r; }
console.log(w('build/desktop/resources/app.asar.unpacked').join('\n'));
"
```

### 3. 强制重新生成 native 预编译
```bash
cd apps/desktop/node_modules/.pnpm/get-windows@9.3.0_encoding@0.1.13/node_modules/get-windows
npx --no-install node-pre-gyp install
```

### 4. 重新打补丁（如果 INC-010 补丁丢了）
见「坑 5」结尾的补丁代码。

---

## 后续 TODO

- [ ] 把脚本接入 `package.json` 的 scripts：
  ```json
  "package:win:local": "node scripts/build-desktop.mjs"
  ```
- [ ] CI 集成：在 GitHub Actions 用 Linux runner 跑这个脚本（看是否需要 Windows runner 验证 .exe）
- [ ] 监控：当 Electron 版本变化时（41 → 42+），检查 NAPI 9 预编译是否仍然兼容
- [ ] 监控：当 `@isaacs/cliui` 新增别名包时，同步加到脚本 step 2 的 `targets`

---

## 关联文档

- `../../LESSONS_LEARNED.md` — 6 个坑的复盘详情（INC-006 ~ INC-012）
- `../package.json` — 项目依赖与 scripts
- `../electron-builder.mjs` — 打包配置（含 INC-011 的 fix）
- `../native-deps.config.mjs` — native 模块声明
- `../module-deps.config.mjs` — 模块文件 glob 生成
- `../external-runtime-deps.config.mjs` — 外部 runtime 模块声明
