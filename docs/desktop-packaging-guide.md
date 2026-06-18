# UGSci 桌面端打包注意事项清单

> 基于 2026-06-18 实际打包踩坑记录  
> 原则：所有配置项必须通过配置文件或环境变量管理，禁止硬编码

---

## 一、环境准备

### 1.1 bun 不执行 electron postinstall

**问题描述**：`electron-vite dev` 启动时报 `Error: Electron uninstall`，Electron 窗口不弹出。

**产生原因**：`bun install` 在某些情况下不触发 `electron` npm 包的 `postinstall` 脚本（`install.js`），该脚本负责下载 ~130MB 的 Electron 二进制到 `node_modules/electron/dist/`。

**解决方案**：
```bash
cd apps/desktop
node node_modules/electron/install.js
```

**预防措施**：
- `bun install` 后验证 `node_modules/electron/dist/electron.exe` 是否存在
- CI/CD 中增加检查步骤：`test -f apps/desktop/node_modules/electron/dist/electron.exe || node apps/desktop/node_modules/electron/install.js`
- 优先使用 pnpm（postinstall 更可靠）

---

### 1.2 ELECTRON_RUN_AS_NODE 环境变量泄漏

**问题描述**：Electron 窗口不弹出，主进程报 `TypeError: Cannot read properties of undefined (reading 'setName')`。`electron.exe --version` 输出 `v24.15.0` 而非 `v41.3.0`。

**产生原因**：WorkBuddy 自身是 Electron 应用，通过 sidecar 进程向 CLI 子进程传递 `ELECTRON_RUN_AS_NODE=1` 环境变量。该变量**泄漏到 Bash shell 会话**中，导致任何 `electron.exe` 都以纯 Node.js 模式运行。在 `ELECTRON_RUN_AS_NODE=1` 下，`require('electron')` 无法找到内置模块，返回 `undefined`。

**解决方案**：
```bash
unset ELECTRON_RUN_AS_NODE
electron.exe --version  # 应输出 v41.3.0
```

**预防措施**：
- 启动 Electron 前**始终**执行 `unset ELECTRON_RUN_AS_NODE`
- 在 `.bashrc` 或启动脚本中显式 `unset ELECTRON_RUN_AS_NODE`：
  ```bash
  alias ugs-desktop='unset ELECTRON_RUN_AS_NODE && cd ~/Documents/UGSci/apps/desktop && bun run dev'
  ```
- CI/CD 中不依赖 shell 环境变量，在 npm scripts 中通过 `cross-env` 显式管理

---

### 1.3 VS2022 BuildTools 被 node-gyp 拒绝

**问题描述**：`@electron/rebuild` 或 `node-gyp rebuild` 报 `Could not find any Visual Studio installation to use`，但 VS2022 BuildTools 已安装在 `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools`。

**产生原因**：
- VS BuildTools SKU 的 `state` 属性通过 `vswhere.exe` 查询时返回 `4294967295`（`0xFFFFFFFF`），node-gyp 的 `VisualStudioFinder` 不认该值
- 未设置 `VSCMD_VER` 环境变量时，node-gyp 无法获取版本信息

**解决方案**（手动设置 MSVC 环境变量）：
```bash
export VCINSTALLDIR="C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC"
export VSINSTALLDIR="C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools"
export VSCMD_VER="17.14.36930.0"  # 通过 vswhere -property installationVersion 获取
export WindowsSDKVersion="10.0.26100.0\\"
export PATH="/c/Program Files (x86)/.../MSVC/14.44.35207/bin/Hostx64/x64:$PATH"
npx node-gyp rebuild --target=<electron_version> --arch=x64 --dist-url=https://electronjs.org/headers
```

**获取 MSVC 版本号**：
```bash
"/c/Program Files (x86)/Microsoft Visual Studio/Installer/vswhere.exe" \
  -products "Microsoft.VisualStudio.Product.BuildTools" \
  -property installationVersion
```

**预防措施**：
- 在 CI/CD 中通过环境变量预配置 MSVC 路径
- 考虑安装完整 Visual Studio（非 BuildTools SKU），其 `state` 值可被 node-gyp 正常识别
- 或选用预编译的 native module（`@napi-rs/canvas`、`node-screenshots` 已提供预编译二进制，`get-windows` 未提供 Windows 预编译版）

---

### 1.4 原生模块缺少 Windows 预编译二进制

**问题描述**：`@electron/rebuild` 尝试编译 `get-windows` 原生模块时失败。

**产生原因**：`get-windows` 的 `lib/binding/` 目录仅包含 macOS 预编译二进制（`napi-6-darwin-*`），无 Windows 版本。electron-builder 的 `native-deps.config.mjs` 将其列入 `nativeModules`，`@electron/rebuild` 检测到未编译时会自动尝试编译。

**解决方案**：
```bash
# 在 electron-builder 打包前手动编译
cd node_modules/get-windows
# 设置 MSVC 环境变量（见 1.3 节）
npx node-gyp rebuild --target=41.3.0 --arch=x64 --dist-url=https://electronjs.org/headers
```

**预防措施**：
- 打包前检查所有 `nativeModules` 列表中的模块是否已编译
- 在 `native-deps.config.mjs` 中对无 Windows 预编译的模块添加注释标注
- 考虑将 `get-windows` 替换为纯 JS 或提供预编译 Windows 二进制

---

## 二、应用标识与配置

### 2.1 package.json name 决定 IPC pipe 名称

**问题描述**：Electron 启动后 `ElectronIPCServer.start()` 报 `EADDRINUSE: address already in use \\.\pipe\lobehub-desktop-dev-electron-ipc`。主进程未完成 bootstrap，用户看到 splash 页无限转圈。

**产生原因**：
- IPC pipe 名称由 `packages/electron-server-ipc/src/const.ts` 的 `WINDOW_PIPE_FILE(id)` 生成：`\\.\pipe\{id}-electron-ipc`
- `id` 参数取自 `apps/desktop/src/main/core/App.ts:10`：
  ```ts
  import { name } from '@/../../package.json';
  ```
- `package.json` 的 `"name"` 仍为 `"lobehub-desktop-dev"`，pipe 名使用旧标识，与之前残留的 Electron 进程冲突

**解决方案**：将 `apps/desktop/package.json` 中的 `"name"` 改为 `"ugsci-desktop-dev"`。

**预防措施**：
- 品牌改名时**必须同步更新**以下文件中的名称标识：
  | 文件 | 字段 | 用途 |
  |------|------|------|
  | `apps/desktop/package.json` | `"name"` | IPC pipe、应用标识 |
  | `apps/desktop/src/main/pre-app-init.ts` | `app.setName()` | 窗口标题、userData 路径 |
  | `apps/desktop/stubs/business-const/src/index.ts` | `BRANDING_NAME` / `ORG_NAME` | 运行时品牌常量 |
  | `apps/desktop/electron-builder.mjs` | `appId` / `protocol` / `executableName` | 安装包元数据 |
- 新增 `apps/desktop/src/main/const/app-id.ts` 统一导出应用标识，禁止各处硬编码

---

### 2.2 BRANDING_NAME 通过 stub 覆盖桌面构建

**问题描述**：虽然主包 `packages/business/const/src/branding.ts` 中 `BRANDING_NAME='UGSci'`，但桌面构建仍显示 `LobeHub`。

**产生原因**：`apps/desktop/stubs/business-const/src/index.ts` 是桌面构建专用的 stub 覆盖，其中 `BRANDING_NAME` 和 `ORG_NAME` 仍为 `'LobeHub'`，覆盖了主包的配置。

**解决方案**：同步更新 `apps/desktop/stubs/business-const/src/index.ts` 中的品牌常量。

**预防措施**：
- stub 文件作为**关键配置文件**，品牌改名时必须列入检查清单
- 在 `electron-vite dev` 启动日志中增加品牌标识输出，方便验证

---

## 三、electron-builder 兼容性

### 3.1 @electron/get v3+ 移除了 ElectronDownloadCacheMode 枚举

**问题描述**：`electron-builder --win` 在 `packaging` 步骤报：
```
TypeError: Cannot read properties of undefined (reading 'ReadWrite')
at resolveCacheMode (.../electronGet.ts:130)
```

**产生原因**：`app-builder-lib@26.14.0` 依赖 `@electron/get` 的 `ElectronDownloadCacheMode.ReadWrite` 枚举，但 pnpm 解析的 `@electron/get` v3+ 版本已移除该枚举。

**解决方案**（临时补丁，重新 `pnpm install` 后需重新应用）：
在 `node_modules/.pnpm/app-builder-lib@.../out/util/electronGet.js` 中：
```js
function resolveCacheMode() {
    return 0; // Hard-coded ReadWrite mode
}
```

**预防措施**：
- 升级 `app-builder-lib` 到兼容 `@electron/get` v3+ 的版本
- 或通过 `.pnpmfile.cjs` 锁定 `@electron/get` 版本为 `^2.0`
- 在 `pnpm.overrides` 中固定：
  ```json
  { "pnpm": { "overrides": { "@electron/get": "^2.0.0" } } }
  ```

### 3.2 Windows NTFS fs.rename 竞态条件

**问题描述**：electron-builder 提取 Electron 二进制时，`fs.rename(tmpDir, targetDir)` 报 `EPERM: operation not permitted`。

**产生原因**：`fs.rm(dir, {recursive:true})` 后文件句柄未立即释放，`fs.rename` 触发 NTFS 权限错误（竞态条件）。WorkBuddy 沙箱环境下问题更严重。

**解决方案**：
- 打包前**务必**清理 `release/` 目录：`rm -rf apps/desktop/release/`
- 引入重试机制（临时补丁）：
  ```js
  for (let retry = 0; retry < 5; retry++) {
    try {
      await fs.rename(tmpDir, dir);
      break;
    } catch (e) {
      if (retry === 4) throw e;
      await new Promise(r => setTimeout(r, 500 * (retry + 1)));
    }
  }
  ```
- 在 WorkBuddy 沙箱外运行打包（直接在 Windows 终端执行）

**预防措施**：
- CI/CD 环境中该问题较少，本地开发建议在原生终端打包
- 打包前 `sleep 2` 等待文件系统稳定

---

## 四、运行时状态

### 4.1 打包残留目录触发 Vite 文件监听器

**问题描述**：electron-vite dev 模式运行时，Vite 客户端频繁触发 `page reload`，日志显示 `LICENSES.chromium.html` 等文件变化。

**产生原因**：
- 多次 electron-builder 打包尝试在 `apps/desktop/` 下创建了 `build/`、`LobeHub/`、`desktop_v2/`、`release/` 等目录
- Vite 开发服务器的文件监听器检测到这些目录中的文件变化（electron-builder 提取的 Chromium license 等），误认为是源码变更，触发 HMR page reload

**解决方案**：
- 清理所有打包残留目录
- 在 `apps/desktop/.gitignore` 中忽略：
  ```
  release
  build
  LobeHub
  desktop_v2
  ```

**预防措施**：
- electron-builder 的 `output` 配置统一到 `.gitignore` 中
- Vite 的 `server.watch.ignored` 可配置忽略模式，避免监听打包输出目录
- electron-vite dev 实际不需要这些目录，打包应使用独立的临时目录

### 4.2 Vite Cold Start 的 ECONNRESET

**问题描述**：渲染进程首次加载时，大量模块请求返回 `ECONNRESET`，导致 SPA 初始化失败，应用卡在 splash 页。

**产生原因**：Electron 主进程通过 `net.fetch` 向 Vite dev server (`127.0.0.1:5173`) 代理请求。冷启动时渲染进程同时发起数百个模块请求，Vite 的连接池溢出。

**解决方案**：
- 该问题在消除 `page reload` 循环后自然缓解（见 4.1）
- 若持续出现，可在 Electron 窗口中 `Ctrl+R` 手动刷新

**预防措施**：
- 考虑在 Vite 配置中增加 `server.watch` 忽略规则和 `server.hmr.overlay: false` 避免循环
- 确保 `electron.vite.config.ts` 中 `hmr.clientPort` 与 `server.port` 一致（目前均为 `5173`）

---

## 五、品牌全局替换检查清单

每次品牌改名时必须逐一验证以下位置：

| 序号 | 文件路径 | 字段/位置 | 类型 |
|------|---------|----------|------|
| 1 | `packages/business/const/src/branding.ts` | `BRANDING_NAME`, `ORG_NAME` | 常量源 |
| 2 | `apps/desktop/stubs/business-const/src/index.ts` | `BRANDING_NAME`, `ORG_NAME` | stub 覆盖 |
| 3 | `apps/desktop/package.json` | `"name"` | 应用标识 |
| 4 | `apps/desktop/src/main/pre-app-init.ts` | `app.setName()` | 窗口标题 |
| 5 | `apps/desktop/src/main/locales/default/common.ts` | `app.name`, `app.description` | 桌面 locale |
| 6 | `apps/desktop/src/main/locales/default/menu.ts` | `macOS.devTools` | 菜单 |
| 7 | `apps/desktop/src/main/locales/default/dialog.ts` | 权限提示文案 | 对话框 |
| 8 | `apps/desktop/resources/locales/en/common.json` | `app.name` | 资源文件 |
| 9 | `apps/desktop/resources/*.html` | `<title>` 标签 | HTML 标题 |
| 10 | `apps/desktop/electron-builder.mjs` | `appId`, `protocol`, `executableName` | 安装包 |
| 11 | `locales/en-US/desktop-onboarding.json` | 全部 LobeHub 引用 | 引导页文案 |
| 12 | `locales/zh-CN/desktop-onboarding.json` | 全部 LobeHub 引用 | 引导页文案 |
| 13 | `src/routes/(desktop)/desktop-onboarding/_layout/index.tsx` | 版权文本 | 前端版权 |
| 14 | `src/components/SkillSourceTag/index.tsx` | builtin tag 文本 | 前端标签 |
| 15 | `src/features/AuthShell/AuthContainer.tsx` | `aria-label` | 辅助功能 |
| 16 | `src/features/ChatInput/ActionBar/Tools/useControls.tsx` | officialTag Tooltip | 前端提示 |

---

## 六、打包命令速查

```bash
# ===== 开发环境 =====
cd apps/desktop
unset ELECTRON_RUN_AS_NODE && bun run dev

# ===== 生产构建 =====
# 1. 编译 dist/
unset ELECTRON_RUN_AS_NODE && npx electron-vite build

# 2. 清理打包残留
rm -rf release build LobeHub desktop_v2

# 3. 预编译原生模块（如需）
export VCINSTALLDIR="C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC"
export VSINSTALLDIR="C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools"
export VSCMD_VER="17.14.36930.0"
cd node_modules/get-windows && npx node-gyp rebuild --target=41.3.0 --arch=x64 --dist-url=https://electronjs.org/headers

# 4. 打包 Windows 安装器
cd ../..
npx electron-builder --win --config electron-builder.mjs --publish never

# ===== 快速验证（不解压到安装器，仅生成解压目录）=====
npx electron-builder --dir --config electron-builder.mjs --publish never
```

---

## 七、环境变量速查

| 变量名 | 作用 | 值示例 |
|--------|------|--------|
| `ELECTRON_RUN_AS_NODE` | 必须为 unset（否则 Electron 以 Node.js 模式运行） | `unset` |
| `UPDATE_CHANNEL` | 更新频道（影响 electron-builder 的 appId） | `stable` / `nightly` |
| `VSCMD_VER` | VS BuildTools 版本（node-gyp 需要） | `"17.14.36930.0"` |
| `VCINSTALLDIR` | VS VC 工具安装路径 | `"C:\...\BuildTools\VC"` |
| `WindowsSDKVersion` | Windows SDK 版本（node-gyp 需要） | `"10.0.26100.0\\"` |
| `NODE_OPTIONS` | 构建时 Node.js 内存限制 | `--max-old-space-size=8192` |
