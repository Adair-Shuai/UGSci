# UGSci Desktop — 构建指南

> 适用于 macOS、Windows、Linux 三大平台的统一构建方案。
> 本文档覆盖从环境准备到产物打包的完整流程，以及 CI/CD 集成方法。

---

## 目录

1. [快速开始](#1-快速开始)
2. [前置条件](#2-前置条件)
   - [通用要求](#21-通用要求)
   - [macOS 额外要求](#22-macos-额外要求)
   - [Windows 额外要求](#23-windows-额外要求)
   - [Linux 额外要求](#24-linux-额外要求)
3. [构建命令](#3-构建命令)
   - [开发模式](#31-开发模式)
   - [仅编译](#32-仅编译)
   - [完整打包](#33-完整打包)
   - [验证产物](#34-验证产物)
   - [清理](#35-清理)
4. [构建配置](#4-构建配置)
   - [发布渠道](#41-发布渠道)
   - [环境变量](#42-环境变量)
   - [原生模块](#43-原生模块)
   - [pnpm 别名处理](#44-pnpm-别名处理)
5. [CI/CD 集成](#5-cicd-集成)
   - [GitHub Actions 配置](#51-github-actions-配置)
   - [构建产物矩阵](#52-构建产物矩阵)
6. [常见问题与排查](#6-常见问题与排查)
   - [macOS 问题](#61-macos-问题)
   - [Windows 问题](#62-windows-问题)
   - [Linux 问题](#63-linux-问题)
   - [通用问题](#64-通用问题)
7. [架构设计](#7-架构设计)

---

## 1. 快速开始

```bash
# 进入 desktop 目录
cd apps/desktop

# 安装依赖（首次）
pnpm install

# 开发模式（热重载）
node scripts/build.mjs --dev

# 本地构建打包
node scripts/build.mjs --package

# 查看帮助
node scripts/build.mjs --help
```

**构建脚本位置：** `apps/desktop/scripts/build.mjs`
**向后兼容包装：** `apps/desktop/scripts/build-desktop.mjs`（委托给 build.mjs）

---

## 2. 前置条件

### 2.1 通用要求

| 组件        | 最低版本 | 说明                   |
| ----------- | -------- | ---------------------- |
| **Node.js** | ≥ 20.x   | CI 使用 24.11.1        |
| **pnpm**    | ≥ 10.x   | 唯一支持的包管理器     |
| **Git**     | 任意     | 用于依赖安装和版本管理 |

```bash
# 验证版本
node --version # ≥ v20.0.0
pnpm --version # ≥ 10.0.0
```

### 2.2 macOS 额外要求

| 组件                         | 说明                                      |
| ---------------------------- | ----------------------------------------- |
| **Xcode Command Line Tools** | 编译原生 C++ 模块（`@napi-rs/canvas` 等） |

```bash
# 安装 Xcode CLI tools
xcode-select --install
```

**macOS 特有原生模块：**

- `node-mac-permissions` — 权限管理
- `@napi-rs/canvas` — Canvas 渲染

**签名（仅发版需要）：**
设置以下环境变量以启用 Apple 公证：

```bash
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="your-password"
export APPLE_ID="your-apple-id"
export APPLE_APP_SPECIFIC_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="your-team-id"
```

本地开发 / 测试构建无需签名，脚本会自动跳过。

### 2.3 Windows 额外要求

| 组件                               | 说明                              |
| ---------------------------------- | --------------------------------- |
| **Visual Studio 2022 Build Tools** | 含 "使用 C++ 的桌面开发" 工作负载 |
| **Python 3.x**                     | node-gyp 编译原生模块需要         |

**安装 VS Build Tools：**

1. 下载 [Visual Studio 2022 Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
2. 安装时选择工作负载：**"使用 C++ 的桌面开发"**
3. 确保以下组件被选中：
   - MSVC v143 - VS 2022 C++ x64/x86 生成工具
   - Windows 11 SDK (或 Windows 10 SDK)
   - C++ CMake tools for Windows

**验证安装：**

```powershell
# 检查 VS 安装
"C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe" -latest -property installationPath

# 检查 Python
python --version
```

**Windows 特有原生模块：**

- `get-windows` — 窗口信息获取
- `@napi-rs/canvas` — Canvas 渲染
- `node-screenshots` — 屏幕截图

### 2.4 Linux 额外要求

| 组件                | 说明           |
| ------------------- | -------------- |
| **build-essential** | gcc/g++ 编译器 |
| **libgtk-3-dev**    | GTK 3 开发库   |
| **libnotify-dev**   | 通知库         |
| **librsvg2-dev**    | SVG 渲染       |
| **libsecret-1-dev** | 密钥存储       |

```bash
# Ubuntu/Debian
sudo apt-get install -y build-essential libgtk-3-dev libnotify-dev librsvg2-dev libsecret-1-dev

# Fedora
sudo dnf install -y gcc-c++ gtk3-devel libnotify-devel librsvg2-devel libsecret-devel

# Arch
sudo pacman -S --needed base-devel gtk3 libnotify librsvg libsecret
```

---

## 3. 构建命令

所有命令在 `apps/desktop/` 目录下执行。

### 3.1 开发模式

启动 `electron-vite dev`，支持热重载。适用于日常开发。

```bash
# 使用统一脚本
node scripts/build.mjs --dev

# 或通过 npm script（需先启动 Next.js）
npm run dev        # electron-vite dev
npm run dev:static # 静态渲染器模式
```

开发模式下：

- 主进程修改自动重启
- 渲染进程修改 HMR 热更新
- Vite Dev Server 端口：`5173`
- 需要 Next.js API Server 在 `localhost:3010` 运行

**完整开发环境启动：**

```bash
# 终端 1：启动 Next.js API
cd ../../ && npm run dev # 端口 3010

# 终端 2：启动 Electron
cd apps/desktop && node scripts/build.mjs --dev
```

### 3.2 仅编译

编译 TypeScript/Vite 产物到 `dist/`，不执行打包。

```bash
node scripts/build.mjs --build
# 或
node scripts/build.mjs # --build 是默认模式
npm run build:main     # 等价
```

产物结构：

```
apps/desktop/dist/
├── main/          # 主进程 (CommonJS/ESM hybrid)
├── preload/       # 预加载脚本
└── renderer/      # SPA 前端 (Vite 构建)
    └── *.html     # index.html, popup.html, overlay.html
```

### 3.3 完整打包

编译 + electron-builder 打包。产物输出到 `release/` 目录。

```bash
# 本地打包（--dir 模式，不生成安装器）
node scripts/build.mjs --package

# Windows NSIS 安装器
node scripts/build.mjs --package --nsis

# macOS DMG
node scripts/build.mjs --package --dmg

# 指定输出目录
node scripts/build.mjs --package --output=dist/my-release

# 跳过产物验证（加快迭代）
node scripts/build.mjs --package --skip-verify

# 指定发布渠道
node scripts/build.mjs --package --channel=nightly
```

**各平台产物：**

| 平台        | `--package` (dir 模式)    | `--nsis` / `--dmg`    |
| ----------- | ------------------------- | --------------------- |
| **macOS**   | `release/mac/*.app`       | `release/*.dmg`       |
| **Windows** | `release/win-unpacked/`   | `release/*-setup.exe` |
| **Linux**   | `release/linux-unpacked/` | `release/*.AppImage`  |

### 3.4 验证产物

验证已构建产物的完整性（不执行构建）。

```bash
node scripts/build.mjs --verify --output=release
```

校验项目：

- 应用入口是否存在（.app/.exe/ 可执行文件）
- app.asar 是否存在
- app.asar.unpacked 中原生模块是否完整
- 关键 pnpm 别名模块是否在 asar 内
- .node 原生二进制数量是否达标

### 3.5 清理

```bash
node scripts/build.mjs --clean
```

清理 `dist/`、`release/` 及隔离临时目录。

---

## 4. 构建配置

所有构建配置集中在 `scripts/build.config.mjs` 中。

### 4.1 发布渠道

| 渠道   | `--channel=` | 图标前缀       | URL Scheme        | 发布类型 |
| ------ | ------------ | -------------- | ----------------- | -------- |
| 稳定版 | `stable`     | `Icon`         | `lobehub`         | 正式发布 |
| 公测版 | `beta`       | `Icon-beta`    | `lobehub`         | 预发布   |
| 每夜版 | `nightly`    | `Icon-nightly` | `lobehub-nightly` | 预发布   |
| 金丝雀 | `canary`     | `Icon`         | `lobehub-canary`  | 预发布   |

### 4.2 环境变量

#### 构建时（electron-vite /electron-builder）

| 变量                          | 默认值                                    | 说明                   |
| ----------------------------- | ----------------------------------------- | ---------------------- |
| `NODE_OPTIONS`                | `--max-old-space-size=8192`               | Vite 打包内存上限      |
| `UPDATE_CHANNEL`              | `stable`                                  | 发布渠道               |
| `UPDATE_SERVER_URL`           | —                                         | 自动更新服务器地址     |
| `ELECTRON_MIRROR`             | `https://npmmirror.com/mirrors/electron/` | 国内 Electron 镜像     |
| `CSC_LINK`                    | —                                         | macOS 签名证书（公钥） |
| `CSC_KEY_PASSWORD`            | —                                         | macOS 签名证书密码     |
| `APPLE_ID`                    | —                                         | Apple 开发者账号       |
| `APPLE_APP_SPECIFIC_PASSWORD` | —                                         | Apple 应用专用密码     |
| `APPLE_TEAM_ID`               | —                                         | Apple 开发者团队 ID    |
| `DESKTOP_RENDERER_STATIC`     | —                                         | 测试静态渲染器模式     |
| `VERBOSE` / `--verbose`       | —                                         | 详细构建日志           |

#### 运行时（Electron 主进程）

| 变量                    | 文件              | 说明          |
| ----------------------- | ----------------- | ------------- |
| `DEBUG_VERBOSE`         | `src/main/env.ts` | 调试日志      |
| `MCP_TOOL_TIMEOUT`      | `src/main/env.ts` | MCP 超时 (ms) |
| `OFFICIAL_CLOUD_SERVER` | `src/main/env.ts` | 云端服务地址  |

### 4.3 原生模块

原生模块（`.node` 二进制）跨平台管理在 `native-deps.config.mjs` 中声明。

| 模块                   | macOS | Windows | Linux | 说明           |
| ---------------------- | ----- | ------- | ----- | -------------- |
| `@napi-rs/canvas`      | ✅    | ✅      | ✅    | Canvas 2D 渲染 |
| `node-screenshots`     | ✅    | ✅      | ✅    | 屏幕截图       |
| `get-windows`          | —     | ✅      | —     | 窗口信息获取   |
| `node-mac-permissions` | ✅    | —       | —     | macOS 权限     |

**重要**：原生模块必须满足三点：

1. 在 `electron.vite.config.ts` 中标记为 `external`
2. 在 `electron-builder.mjs` 中通过 `files` 显式包含
3. 在 `electron-builder.mjs` 中通过 `asarUnpack` 解压

这些规则已在配置中自动化处理，无需手动干预。

### 4.4 pnpm 别名处理

pnpm 的别名功能会导致运行时模块解析失败（详见 LESSONS_LEARNED.md INC-011）。

**受影响的包（自动处理）：**

| 原始包名       | pnpm 别名目录        |
| -------------- | -------------------- |
| `strip-ansi`   | `strip-ansi@6.0.1`   |
| `wrap-ansi`    | `wrap-ansi@7.0.0`    |
| `ansi-regex`   | `ansi-regex@5.0.1`   |
| `string-width` | `string-width@4.2.3` |

构建脚本的 `preparePnpmAliases()` 步骤会自动将这些别名包的 symlink 转换为真实目录。

### 3.6 多平台构建

**核心策略**：Electron 构建分三个层级，跨平台能力逐层递减。

```
层级 1 ─ electron-vite build（代码编译）
         dist/main/ + dist/preload/ + dist/renderer/
         → 完全跨平台 ✅  一次编译，所有平台复用

层级 2 ─ electron-builder --dir（解包产物）
         macOS 可交叉打 Linux (Docker) / Windows (wine)
         → 部分交叉 ⚠️  取决于宿主机能力

层级 3 ─ electron-builder 安装器（dmg/nsis/AppImage）
         需要目标平台原生环境
         → 平台绑定 ❌  CI 矩阵最可靠
```

#### 3.6.1 一次编译，多平台复用

```bash
# 方式 1：仅编译代码层（最快，产物跨平台通用）
node scripts/build.mjs --platform=all --build --no-package

# 方式 2：编译 + 尝试多平台打包（macOS 宿主机）
node scripts/build.mjs --package-all

# 方式 3：指定目标平台列表
node scripts/build.mjs --platform=darwin,linux --package --cross

# 方式 4：先统一编译，再逐平台打包（推荐工作流）
node scripts/build.mjs --build                  # Step 1: 一次编译
node scripts/build.mjs --package --skip-prepare # Step 2: macOS 打包
# 将 dist/ 复制到 Windows/Linux 机器后：
node scripts/build.mjs --package --skip-prepare # Step 3: Win 打包
```

#### 3.6.2 跨平台能力矩阵

|     宿主机 → 目标     | 代码编译 | --dir 打包 | 安装器 | 说明          |
| :-------------------: | :------: | :--------: | :----: | ------------- |
|   **macOS → macOS**   |    ✅    |     ✅     |   ✅   | 原生，最快    |
|  **macOS → Windows**  |    ✅    |     ✅     |   ✅   | wine 交叉编译 |
|   **macOS → Linux**   |    ✅    |     ✅     |   ✅   | Docker 内构建 |
|   **Linux → Linux**   |    ✅    |     ✅     |   ✅   | 原生          |
|  **Linux → Windows**  |    ✅    |     ✅     |   ✅   | wine 交叉编译 |
|   **Linux → macOS**   |    ✅    |     ❌     |   ❌   | 需要 Xcode    |
| **Windows → Windows** |    ✅    |     ✅     |   ✅   | 原生          |
|  **Windows → Linux**  |    ✅    |     ✅     |   ✅   | Docker 内构建 |
|  **Windows → macOS**  |    ✅    |     ❌     |   ❌   | 需要 Xcode    |

> **结论**：macOS 是唯一可以从单一宿主机打出全部三平台安装器的环境。

#### 3.6.3 推荐工作流

**场景 A：本地开发 + 多平台验证（你的 macOS 机器）**

```bash
# 1. 编译一次（~2 分钟）
node scripts/build.mjs --build

# 2. 本地 macOS 打包（~4 分钟）
node scripts/build.mjs --package --skip-prepare

# 3. 交叉打包 Linux（需要 Docker，~6 分钟）
node scripts/build.mjs --platform=linux --package --skip-prepare --cross

# 4. Windows 无法在 macOS 上完整交叉编译
#    → 在 Windows 机器上复制 dist/ 后运行：
#    node scripts/build.mjs --package --skip-prepare
```

**场景 B：CI 矩阵构建（GitHub Actions，推荐）**

```yaml
# .github/workflows/build-desktop.yml
jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: pnpm install
      - name: Build & Package
        run: node apps/desktop/scripts/build.mjs --package --skip-verify
```

---

## 5. CI/CD 集成

### 5.1 GitHub Actions 配置

项目已配置 5 个 GitHub Actions 工作流：

| 工作流                       | 触发              | 平台                                     |
| ---------------------------- | ----------------- | ---------------------------------------- |
| `release-desktop-stable.yml` | Release (正式)    | macOS ARM64, macOS Intel, Windows, Linux |
| `release-desktop-beta.yml`   | Release (预发布)  | macOS Intel, Windows, Linux              |
| `release-desktop-canary.yml` | canary 分支 push  | macOS ARM64, macOS Intel, Windows, Linux |
| `manual-build-desktop.yml`   | workflow_dispatch | 可选                                     |
| `pr-build-desktop.yml`       | PR + 标签         | macOS Intel, Windows, Linux              |

**共用 Composite Action:**

- `desktop-build-setup` — 环境设置 + 依赖安装
- `desktop-upload-artifacts` — 产物上传
- `desktop-publish-s3` — S3 发布
- `desktop-cleanup-s3` — 旧版本清理

#### 最小 CI 配置示例

```yaml
# .github/workflows/build-desktop.yml
name: Build Desktop
on: [push]

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/desktop-build-setup
        with:
          node-version: '24.11.1'
      - name: Build Desktop
        run: |
          node apps/desktop/scripts/build.mjs --package --skip-verify
        env:
          UPDATE_CHANNEL: stable
```

### 5.2 构建产物矩阵

| 平台        | Runner               | 编译时间 (约) | 产物大小 (约)          | 主要产物                         |
| ----------- | -------------------- | ------------- | ---------------------- | -------------------------------- |
| macOS ARM64 | `macos-latest` (M1+) | 8–12 min      | 350–450 MB (.dmg)      | `.dmg`, `.zip`, `latest-mac.yml` |
| macOS Intel | `macos-13`           | 10–15 min     | 350–450 MB (.dmg)      | `.dmg`, `.zip`, `latest-mac.yml` |
| Windows     | `windows-2025`       | 10–15 min     | 250–350 MB (.exe)      | `.exe`, `latest.yml`             |
| Linux       | `ubuntu-latest`      | 8–10 min      | 200–300 MB (.AppImage) | `.AppImage`, `.deb`, `.rpm`      |

---

## 6. 常见问题与排查

### 6.1 macOS 问题

#### 构建报错 "无法验证开发者"

**原因**：本地构建未签名。
**解决**：这是正常的，首次打开时按住 `Control` 点击应用 → "打开"。或运行：

```bash
sudo xattr -rd com.apple.quarantine release/mac/*.app
```

#### 原生模块编译失败

```bash
# 清理重装
rm -rf node_modules
pnpm install
cd node_modules/@napi-rs/canvas && npx node-pre-gyp rebuild
```

### 6.2 Windows 问题

#### `MSBUILD : error MSB8020: The build tools for Visual Studio 2019 cannot be found`

**原因**（INC-008）：VS BuildTools 未安装或版本不匹配。
**解决**：

1. 安装 [Visual Studio 2022 Build Tools](https://visualstudio.microsoft.com/downloads/)
2. 选择 "使用 C++ 的桌面开发" 工作负载
3. 或设置环境变量：

```powershell
$env:npm_config_msvs_version = "2022"
```

#### `EPERM: operation not permitted, rename`

**原因**（INC-012）：signtool / 杀毒软件临时锁定产物文件。
**解决**：构建脚本已自动处理 —— 使用隔离输出目录 + 多次重试。如仍失败：

```powershell
# 关闭 Windows Defender 实时保护（仅构建期间）
# 或在排除项中添加项目目录
```

#### `EMFILE: too many open files`

**原因**（INC-010）：pnpm 的 `TraversalNodeModulesCollector` 打开过多文件。
**解决**：已在 `electron-builder.mjs` 配置 `npmRebuild: true`。
如仍出现：使用 `--skip-prepare` 跳过编译步骤后重新打包。

#### SmartScreen 拦截

首次运行 `LobeHub.exe` 可能被 SmartScreen 拦截：

1. 右键 `LobeHub.exe` → 属性
2. 勾选 "解除锁定" → 确定

### 6.3 Linux 问题

#### `cannot find -lgtk-3`

```bash
sudo apt-get install -y libgtk-3-dev
```

#### AppImage 无法运行

```bash
chmod +x ./LobeHub-*.AppImage
./LobeHub-*.AppImage --no-sandbox
```

### 6.4 通用问题

#### Electron 二进制下载失败（INC-006）

```bash
# 设置国内镜像（已默认配置）
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"

# 手动下载
node node_modules/electron/install.js
```

#### `ELECTRON_RUN_AS_NODE` 泄漏（INC-007）

构建脚本会自动清除此环境变量。如手动构建时遇到：

```bash
unset ELECTRON_RUN_AS_NODE
```

#### pnpm 别名模块缺失（INC-011）

```bash
# 检查关键别名是否已复制为真实目录
ls -la apps/desktop/node_modules/strip-ansi
ls -la apps/desktop/node_modules/wrap-ansi

# 如为 symlink，手动重建
node apps/desktop/scripts/build.mjs --package --skip-prepare
```

#### 构建缓慢

```bash
# 跳过已验证的步骤
node scripts/build.mjs --package --skip-prepare --skip-verify

# 增加内存
NODE_OPTIONS="--max-old-space-size=16384" node scripts/build.mjs --package
```

---

## 7. 架构设计

### 文件结构

```
apps/desktop/
├── scripts/
│   ├── build.mjs              # 【新】统一跨平台构建脚本
│   ├── build.config.mjs       # 【新】构建配置（平台、渠道、模块声明）
│   ├── build-desktop.mjs      # 向后兼容包装（委托给 build.mjs）
│   ├── download-agent-browser.mjs  # Agent-browser 二进制下载
│   ├── generate-tray-template.mjs  # 托盘图标模板生成
│   └── ...
├── electron-vite.config.ts    # electron-vite 三进程构建配置
├── electron-builder.mjs       # electron-builder 打包配置
├── native-deps.config.mjs     # 原生模块依赖解析
├── module-deps.config.mjs     # 模块依赖递归解析
├── external-runtime-deps.config.mjs  # 外部运行时模块配置
├── BUILD.md                   # 【新】本文档
├── Development.md             # 开发指南（架构详解）
└── package.json               # 包定义与 npm scripts

根目录：
scripts/electronWorkflow/
├── buildElectron.ts           # CI 构建入口（委托给 build.mjs）
├── buildDesktopChannel.ts     # 渠道式构建流
├── setDesktopVersion.ts       # 版本号/图标设置
└── mergeMacReleaseFiles.js    # macOS 多架构 yml 合并
```

### 数据流

```
用户命令
    │
    ▼
scripts/build.mjs  ◄── build.config.mjs
    │                    (平台定义、渠道、原生模块清单)
    ├─ 环境检查
    │    ├─ Node.js / pnpm 版本
    │    ├─ Electron 二进制 (INC-006)
    │    ├─ 平台工具链
    │    └─ ELECTRON_RUN_AS_NODE 清理 (INC-007)
    │
    ├─ pnpm 别名准备 (INC-011)
    │    └─ 将别名 symlink → 真实目录
    │
    ├─ electron-vite build
    │    ├─ Main 进程 → dist/main/
    │    ├─ Preload → dist/preload/
    │    └─ Renderer → dist/renderer/
    │
    ├─ electron-builder
    │    ├─ beforePack: 原生模块复制、agent-browser 下载
    │    ├─ 隔离输出目录 (INC-012)
    │    └─ afterPack: macOS Assets.car, .lproj 清理, native 复制
    │
    ├─ 产物搬迁 (INC-012)
    │    └─ rename → copy (fallback) → 重试清理
    │
    └─ 产物验证
         ├─ 入口文件检查
         ├─ asar 完整性
         ├─ 关键模块校验
         └─ .node 原生模块数量
```

### 经验编码汇总

| 编号    | 问题                      | 解决方案                               | 位置                     |
| ------- | ------------------------- | -------------------------------------- | ------------------------ |
| INC-006 | Electron 二进制缺失       | 手动下载 fallback                      | `ensureElectronBinary()` |
| INC-007 | ELECTRON_RUN_AS_NODE 泄漏 | 自动清除环境变量                       | `envCheck()`             |
| INC-008 | VS BuildTools 未安装      | 平台检查 + 指引                        | `windowsEnvCheck()`      |
| INC-009 | EPERM rename              | 已在后续步骤覆盖                       | —                        |
| INC-010 | EMFILE 文件句柄           | npmRebuild + 配置                      | `electron-builder.mjs`   |
| INC-011 | pnpm 别名缺失             | 构建时复制为真实目录                   | `preparePnpmAliases()`   |
| INC-012 | Windows 文件锁            | 隔离输出 + rename/copy fallback + 重试 | `commitOutput()`         |

### 与上游（LobeHub）的差异

本项目的桌面构建在 LobeHub 基础上进行了以下定制：

1. **统一构建脚本** — `scripts/build.mjs` 提供跨平台统一入口
2. **pnpm 别名自动修复** — 自动处理 strip-ansi 等别名包
3. **Windows 隔离输出** — 防止文件锁导致构建失败
4. **产物完整性校验** — 打包后自动验证关键模块
5. **中文构建文档** — BUILD.md 面向国内开发环境

---

> **变更日志**
>
> - 2026-06-18: 初始版本，统一构建脚本 `build.mjs` + 配置 `build.config.mjs` + 本文档
