# UGSci 客户端开发环境搭建完整步骤

> **适用项目**：UGSci 储气智脑（基于 LobeHub 二次开发）
> **适用平台**：macOS（主）、Windows、Linux
> **文档依据**：`AGENTS.md` · `LESSONS_LEARNED.md` (INC-001~014) · `docs/desktop-packaging-guide.md` · `apps/desktop/BUILD.md` · `apps/desktop/Development.md` · `package.json` · `.env.example.development`
> **生成时间**：2026-06-21

---

## 0. 当前环境快照（已审计）

| 检查项 | 当前状态 | 备注 |
|---|---|---|
| 操作系统 | macOS 15.5 (24F74) on Mac mini M4 | 32GB RAM / 460GB 磁盘（214GB 可用） |
| Node.js | v22.22.2 | ✅ 满足 ≥20 |
| pnpm | 10.33.0 | ✅ 项目唯一指定 |
| bun | 1.3.14 | ✅ 用于 `bun run dev` / `bun run build:next` |
| Git | 2.39.5 | ✅ |
| Docker | 运行中 | ✅ `lobechat-pg` 容器 Up 2 days |
| PostgreSQL | :5432 通 | ✅ 121 张表已迁移 |
| Redis | :6379 PONG | ✅ 本地原生运行 |
| RustFS (S3) | :9000 未启动 | ⚠️ dev:docker 启动 |
| SearXNG | :8180 未启动 | ⚠️ dev:docker 启动 |
| Xcode CLI Tools | `/Library/Developer/CommandLineTools` | ✅ |
| node-gyp | ❌ 未装（按需） | 仅 desktop 原生模块需要 |
| `ELECTRON_RUN_AS_NODE` | **=1** | ⚠️ INC-007 必须 unset |
| 项目分支 | `ugs/custom` | ✅ |
| 根 `node_modules/electron/dist` | ❌ 不存在 | ⚠️ INC-006：dev 用不到，desktop 端已 OK |
| `apps/desktop/node_modules/electron/dist` | ✅ 存在 `Electron.app/Contents/MacOS/Electron` | ✅ |
| `apps/desktop/release/mac-arm64/ugsci-desktop-dev.app` | ✅ 已构建 | 历史产物 |
| `package.json#name` | `@ugsci/desktop` | ✅ 已 UGSci 化 |
| 数据库密码 | `change_this_password_on_production` | ⚠️ 注释强制要求生产必改 |
| Redis 数据 | 无密码 | 仅为 dev |
| SMTP（QQ 邮箱） | 已配 756599703@qq.com | ✅ |

**结论**：本机已具备 UGSci 桌面端 + Web 端的完整开发能力，仅需做少量收尾（启动缺失服务 + 环境变量清理 + 可选：根 electron 二进制安装）。

---

## 一、环境准备

### 1.1 系统要求检查

```bash
# 已通过，无需重复操作（仅为文档化）
sw_vers                              # macOS ≥ 12 (Monterey)
node --version                       # ≥ 20.x（本机 22.22.2）
pnpm --version                       # ≥ 10.x（本机 10.33.0）
df -h /                              # 至少 30GB 可用（本机 214GB）
system_profiler SPHardwareDataType   # 内存 ≥ 16GB（本机 32GB）
```

### 1.2 必装基础工具

| 工具 | 版本 | 安装方式 | 验证 |
|---|---|---|---|
| Xcode CLI Tools | 任意 | `xcode-select --install` | `xcode-select -p` |
| Node.js | ≥20.x | 本机已托管 v22.22.2（建议用 `.nvmrc`：`lts/krypton`） | `node --version` |
| pnpm | ≥10.x | 托管 v10.33.0（项目 `packageManager` 锁定） | `pnpm --version` |
| bun | 1.x | 托管 v1.3.14 | `bun --version` |
| Git | 任意 | 预装 | `git --version` |
| Docker Desktop | 最新 | 用于 PostgreSQL/Redis/RustFS/SearXNG 容器 | `docker --version` |
| Redis | 7.x | 本地服务或容器 | `redis-cli ping` |

### 1.3 关键防坑步骤（必看 INC-007）

**`ELECTRON_RUN_AS_NODE=1` 必须从当前 shell 清除**，否则 Electron 启动会以纯 Node.js 模式运行（`require('electron')` 返回 undefined）。

```bash
unset ELECTRON_RUN_AS_NODE

# 写入 .zshrc 一劳永逸（可选）
echo 'unset ELECTRON_RUN_AS_NODE' >> ~/.zshrc

# 创建桌面端启动别名（可选）
echo 'alias ugs-desktop="unset ELECTRON_RUN_AS_NODE && cd ~/Documents/UGSci/apps/desktop && pnpm run dev"' >> ~/.zshrc
```

**验证**：
```bash
echo $ELECTRON_RUN_AS_NODE  # 应输出空
```

---

## 二、依赖安装

### 2.1 读取依赖配置

`package.json` 已确认关键字段：
- `packageManager: pnpm@10.33.0+sha512.10568...`（强制锁版）
- `workspaces: packages/*, packages/business/*, e2e, apps/desktop/src/main`
- `engines`：未声明（隐式 ≥20）
- 93 个 workspace packages，~3700 个顶层依赖

### 2.2 安装项目根依赖（pnpm）

```bash
cd /Users/lzw/Documents/UGSci
pnpm install
```

**预期耗时**：3-8 分钟（首次），二次 < 30s

**pnpm 配置**（`pnpm-workspace.yaml` 已固化）：
- `onlyBuiltDependencies` 列出允许运行 postinstall 的 16 个包
  （`electron` / `electron-builder` / `@napi-rs/canvas` / `get-windows` / `sharp` / `esbuild` 等）
- `lockfile=false`（项目刻意不提交 lockfile，复用上游）
- `resolution-mode=highest`（取最新次版本）

### 2.3 安装 apps/desktop 端依赖

```bash
cd /Users/lzw/Documents/UGSci/apps/desktop
pnpm install
```

**INC-006 关键防坑**：`bun install` 在某些场景不执行 `electron` postinstall → `node_modules/electron/dist/` 为空 → `electron-vite dev` 报 `Error: Electron uninstall`。

```bash
# 验证 electron 二进制存在
ls -la apps/desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron

# 若不存在（已存在则跳过）：
cd apps/desktop
node node_modules/electron/install.js  # 下载 ~130MB 二进制
```

### 2.4 启动基础设施服务（Docker Compose）

`.env.development` 依赖的 4 个服务：
- **PostgreSQL (ParadeDB)** — 含 pgvector + pg_search 扩展
- **Redis** — 缓存/队列
- **RustFS** — S3 兼容对象存储
- **SearXNG** — 搜索聚合

```bash
cd /Users/lzw/Documents/UGSci
docker compose -f docker-compose/dev/docker-compose.yml up -d --wait postgresql redis rustfs searxng
```

**等价 npm script**：
```bash
pnpm run dev:docker       # 启动上述 4 个容器
pnpm run dev:docker:down  # 停止
pnpm run dev:docker:reset # 清数据重建（**危险**：会删除所有本地数据）
```

**本机当前状态**：仅 `lobechat-pg`（ParadeDB）在跑（独立容器，名字不匹配 `lobe-postgres`），其它三个需启动。Redis 已用本机原生服务跑通。

### 2.5 验证依赖完整性

```bash
# pnpm 全工作区检查
pnpm -r list --depth -1 2>&1 | head -30

# 关键原生模块存在性
ls apps/desktop/node_modules/{electron,@napi-rs/canvas,get-windows,node-mac-permissions,node-screenshots}/dist 2>/dev/null

# 关键命令可执行
ls node_modules/.bin/{next,vite,tsc,electron-builder,drizzle-kit} 2>/dev/null
```

---

## 三、配置设置

### 3.1 环境变量配置

**根 `.env.development`**（已存在，1573B，2026-06-19 最后修改）已包含：
- `APP_URL=http://localhost:3010`
- `SSRF_ALLOW_PRIVATE_IP_ADDRESS=1`（dev 必需，访问 localhost 服务）
- `KEY_VAULTS_SECRET` / `AUTH_SECRET`（已预生成 dev-only）
- `DATABASE_URL=postgresql://postgres:change_this_password_on_production@localhost:5432/lobechat`
- `REDIS_URL=redis://localhost:6379`
- `S3_*` RustFS 配置
- `SMTP_*` QQ 邮箱配置
- AI API keys 已注释（按需启用）

**desktop `.env.desktop`**（已存在，321B）已包含：
- `APP_URL=http://localhost:3015`（端口与 web 端不同！）
- `KEY_VAULTS_SECRET`（独立 secret）
- `DATABASE_URL=postgresql://postgres@localhost:5432/postgres`（**注意**：无密码，与 root 不同）
- `DESKTOP_BUILD=true`

**新增 / 修改**：
```bash
# 若需要启用某个 AI 提供方，取消对应行的注释并填入 key
# 例：
echo 'OPENAI_API_KEY=sk-your-key' >> /Users/lzw/Documents/UGSci/.env.development
```

**重要规则**：
- Web 端 dev 默认连 `localhost:3010`，desktop 端连 `localhost:3015`（避免端口冲突）
- `SSRF_ALLOW_PRIVATE_IP_ADDRESS=1` **仅 dev**，生产必须置 `0`
- 桌面端 `.env.desktop` 的 `DATABASE_URL` 无密码（ParadeDB 镜像默认空密码），如启用认证需改

### 3.2 配置文件调整

#### 数据库连接

`.env.development` 里的 `DATABASE_URL` 已对齐 ParadeDB 镜像默认配置。

#### 应用品牌标识

按 INC-013 教训 — 品牌改名时必须同步的清单：

| 文件 | 字段 | 当前值 |
|---|---|---|
| `package.json` (root) | `name` | `@ugsci/desktop` ✅ |
| `apps/desktop/package.json` | `name` | `ugsci-desktop-dev` ✅ |
| `apps/desktop/src/main/const/env.ts` | `OFFICIAL_CLOUD_SERVER` | `http://localhost:3010` ✅ |
| `apps/desktop/electron-builder.mjs` | `appId` / `productName` / `executableName` | 已 UGSci 化 ✅ |
| `apps/desktop/stubs/business-const/src/index.ts` | `BRANDING_NAME` / `ORG_NAME` | 已 UGSci 化 ✅ |
| `packages/const/src/url.ts` | `OFFICIAL_URL` / `OFFICIAL_SITE` | 已 UGSci 化（读 env 兜底 localhost）✅ |

#### Vite/SPA 端口

| 服务 | 端口 | 用途 |
|---|---|---|
| Next.js (root) | 3010 | Web 后端 + API |
| Vite SPA | 9876 | 渲染进程（`vite --port 9876`） |
| Vite SPA Auth | 3013 | 登录页 SPA |
| Vite SPA Mobile | 3012 | 移动端 SPA |
| Desktop Main | 3015 | 桌面端独立 server |
| Next start (prod) | 3210 | 生产模式 |

### 3.3 证书 / 密钥

dev 环境**无需证书**。生产桌面打包需：

```bash
# macOS（仅发版需要，本地构建无需）
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="your-password"
export APPLE_ID="your-apple-id"
export APPLE_APP_SPECIFIC_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="your-team-id"
```

桌面端 SSL/TLS 调试证书开发期不需要。

### 3.4 Docker 容器状态校验

```bash
# 当前
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"

# 期望：lobe-postgres / lobe-redis / lobe-rustfs / lobe-searxng 均 Up
# （本机当前只有 lobechat-pg，需要启动其它三个）
```

**容器命名不匹配警告**：
- 本机容器叫 `lobechat-pg`（手动命名）
- `docker-compose/dev/docker-compose.yml` 定义的是 `lobe-postgres`
- 若用 `dev:docker` 启动会因 5432 端口占用而失败 → **先停旧容器或改 compose 容器名**

---

## 四、构建步骤

### 4.1 清理旧构建

**Web 端**：
```bash
cd /Users/lzw/Documents/UGSci
rm -rf .next public/_spa public/_spa-auth
```

**桌面端（关键 INC-014）**：
```bash
# 1. 清理 Vite HMR 误监听的打包残留
rm -rf apps/desktop/{build,release,LobeHub,desktop_v2,dist}

# 2. 清理旧的打包残留目录
ls -d apps/desktop/release.old-* 2>/dev/null | xargs -I {} rm -rf {}
```

### 4.2 执行构建

#### 方式 A：Web 端完整构建

```bash
cd /Users/lzw/Documents/UGSci
pnpm run build
# 等价：bun run build:spa && bun run build:spa:auth && bun run build:spa:copy && bun run build:next
```

**输出**：
- `public/_spa/` — SPA 主包
- `public/_spa-auth/` — 登录页 SPA
- `.next/` — Next.js 编译产物

#### 方式 B：桌面端构建

```bash
cd /Users/lzw/Documents/UGSci
node apps/desktop/scripts/build.mjs --build
# 等价 npm script: pnpm run desktop:build
```

**参数**（参考 `apps/desktop/scripts/build.mjs`）：
- `--dev` — 开发模式（热重载）
- `--build` — 仅编译（不打包成安装器）
- `--package` — 完整打包（产物在 `release/<platform>/`）
- `--verify` — 校验产物
- `--clean` — 清理构建目录
- `--platform=mac|win|linux` 或 `all`（多平台）
- `--cross` — 启用交叉编译（实验性）

**本机历史产物**：
```
apps/desktop/release/mac-arm64/ugsci-desktop-dev.app   (358MB)
```

#### 方式 C：仅桌面 SPA 编译（开发期 HMR 用）

```bash
cd /Users/lzw/Documents/UGSci/apps/desktop
pnpm run build   # apps/desktop 自己的 vite build
```

### 4.3 验证构建

**Web 端**：
```bash
ls -la /Users/lzw/Documents/UGSci/.next/BUILD_ID  # 存在即成功
ls -la /Users/lzw/Documents/UGSci/public/_spa/index.html
```

**桌面端**：
```bash
cd /Users/lzw/Documents/UGSci
node apps/desktop/scripts/build.mjs --verify
# 等价：pnpm run desktop:verify
# 检查：app.asar 存在 / 主进程 JS / preload / renderer 资源 / 原生模块
```

**手工校验清单**：
```bash
# 1. app.asar 存在
test -f apps/desktop/release/mac-arm64/ugsci-desktop-dev.app/Contents/Resources/app.asar && echo "✅ asar"

# 2. Electron 二进制
test -f apps/desktop/release/mac-arm64/ugsci-desktop-dev.app/Contents/MacOS/ugsci-desktop-dev && echo "✅ main"

# 3. 原生模块
ls apps/desktop/release/mac-arm64/ugsci-desktop-dev.app/Contents/Resources/app.asar.unpacked/node_modules/@napi-rs/canvas 2>&1 | head -3
```

---

## 五、启动开发环境

### 5.1 启动服务（按顺序）

```bash
# 1. 启动基础设施（如果未跑）
pnpm run dev:docker
# 等价：docker compose -f docker-compose/dev/docker-compose.yml up -d --wait postgresql redis rustfs searxng

# 2. 数据库迁移（首次或 schema 变更后必跑）
pnpm run db:migrate
# 等价：cross-env MIGRATION_DB=1 tsx ./scripts/migrateServerDB/index.ts
```

**关键警告（INC-001）**：db:migrate 涉及 schema 操作前必读 `LESSONS_LEARNED.md` 第 1 节。

### 5.2 启动开发服务器

#### 选项 A：Web 端（Next.js + Vite SPA 并发）

```bash
cd /Users/lzw/Documents/UGSci
pnpm run dev
# 等价：tsx scripts/devStartupSequence.mts
# → Next.js 16 (Turbopack) on http://localhost:3010
# → Vite SPA on http://localhost:9876
```

访问：<http://localhost:3010>

**Debug Proxy（连接线上后端）**：
```
https://app.lobehub.com/_dangerous_local_dev_proxy?debug-host=http%3A%2F%2Flocalhost%3A9876
```

#### 选项 B：仅前端 SPA（连线上后端）

```bash
pnpm run dev:spa        # http://localhost:9876
pnpm run dev:spa:auth    # http://localhost:3013
pnpm run dev:spa:mobile  # http://localhost:3012
```

#### 选项 C：桌面端开发

```bash
cd /Users/lzw/Documents/UGSci
pnpm run dev:desktop
# 等价：cd apps/desktop && pnpm run dev

# 或绕过 wrapper：
unset ELECTRON_RUN_AS_NODE
node apps/desktop/scripts/build.mjs --dev
```

**关键步骤**：
1. `unset ELECTRON_RUN_AS_NODE`（**必做**，否则 Electron 不弹窗）
2. 桌面端先要 `node apps/desktop/node_modules/electron/install.js` 一次（INC-006）

#### 选项 D：桌面端运行已构建的 .app

```bash
open /Users/lzw/Documents/UGSci/apps/desktop/release/mac-arm64/ugsci-desktop-dev.app
```

### 5.3 功能验证清单

| 验证项 | 路径 / 命令 | 预期 |
|---|---|---|
| 首页加载 | <http://localhost:3010> | 显示登录 / 主页 |
| 用户注册 | /signin → 邮箱验证码 | QQ SMTP 发送成功 |
| 新建对话 | 主页 → New Chat | 进入对话页 |
| 发送消息 | 输入 → 发送 | 调用 LLM 流式返回 |
| 知识库 | /knowledge | 文件上传 + Embedding |
| 数据库连通 | `docker exec lobechat-pg psql -U postgres -c '\dt'` | 显示 121 张表 |
| Redis 连通 | `redis-cli ping` | PONG |
| S3 上传 | 上传文件 | 200 OK |
| 搜索 | 触发 SearXNG | 命中结果 |
| 桌面端启动 | `open release/.../ugsci-desktop-dev.app` | 窗口弹出 + OAuth 走 localhost:3010 |

### 5.4 调试配置

**SWR 无限 loading 排查**（参考 INC-005）：
```bash
# 检查 useClientDataSWR 的 onErrorRetry 签名
grep -A 5 "onErrorRetry" node_modules/swr/dist/_internal/types.d.mts
```

**桌面端问题排查**：
```bash
# 主进程日志
tail -f ~/Library/Logs/ugsci-desktop-dev/main.log

# 渲染进程日志：DevTools 自动打开（dev 模式）
# 或菜单 View → Toggle Developer Tools

# IPC 通道验证
lsof | grep "lobehub-desktop-dev"  # 旧 pipe
lsof | grep "ugsci-desktop-dev"    # 当前 pipe
```

---

## 六、避坑清单（来自构建历史）

按出现频次和严重程度排序：

| INC# | 现象 | 规避命令 / 检查 |
|---|---|---|
| INC-007 | `ELECTRON_RUN_AS_NODE=1` 泄漏，Electron 不弹窗 | `unset ELECTRON_RUN_AS_NODE` 或用别名 |
| INC-006 | bun install 不触发 electron postinstall | 手动 `node node_modules/electron/install.js` |
| INC-014 | 打包残留目录触发 Vite HMR 无限 reload | 清理 `apps/desktop/{build,release,LobeHub,desktop_v2}` |
| INC-013 | `package.json#name` 未同步导致 IPC pipe EADDRINUSE | 品牌改名时同步改 `apps/desktop/package.json#name` |
| INC-005 | SWR `onErrorRetry` 参数索引错误导致页面永 loading | 详见 `src/libs/swr/index.ts` |
| INC-001 | DELETE agents 表触发级联删除 | 用 UPDATE 替代 DELETE |
| INC-002 | lucide-react 导入不存在的图标 | `node -e "const l=require('lucide-react'); console.log(typeof l.Tool)"` |
| INC-003 | 改 `useNavLayout.ts` 数组顺序无效 | 改 `DEFAULT_SIDEBAR_ITEMS` 数组 |
| INC-004 | ProductLogo 在 UGSci 品牌下渲染空 | `CustomLogo` 源头修 fallback |
| INC-008 | VS2022 BuildTools state=0xFFFFFFFF 被 node-gyp 拒绝 | 手动设 `VSCMD_VER` / `VCINSTALLDIR` |
| INC-009 | electron-builder 三个兼容性问题 | 见 `docs/desktop-packaging-guide.md` §3 |
| INC-010 | pnpm list Windows EMFILE | 用 `TraversalNodeModulesCollector` |
| INC-011 | pnpm 别名 (strip-ansi-cjs) 导致 asar 缺依赖 | 复制 `node_modules/strip-ansi` 真实目录 |
| INC-012 | Windows app.asar 文件锁 EBUSY | 写到新目录而非覆盖 |

**每次遇到问题必读**：`/Users/lzw/Documents/UGSci/LESSONS_LEARNED.md` 第六节「复盘检查清单」。

---

## 七、文件位置速查

| 用途 | 路径 |
|---|---|
| 根 package.json | `package.json` |
| 桌面端构建脚本 | `apps/desktop/scripts/build.mjs` |
| 桌面端构建配置 | `apps/desktop/scripts/build.config.mjs` |
| 桌面端原生模块声明 | `apps/desktop/native-deps.config.mjs` |
| 桌面端 pnpm 别名处理 | `apps/desktop/external-runtime-deps.config.mjs` |
| 桌面端 electron-builder 配置 | `apps/desktop/electron-builder.mjs` |
| 桌面端 vite 配置 | `apps/desktop/electron.vite.config.ts` |
| Web 端 dev 启动编排 | `scripts/devStartupSequence.mts` |
| 数据库迁移脚本 | `scripts/migrateServerDB/index.ts` |
| Drizzle 配置 | `drizzle.config.ts` |
| 桌面端开发文档 | `apps/desktop/Development.md` |
| 桌面端构建文档 | `apps/desktop/BUILD.md` |
| 桌面端打包避坑 | `docs/desktop-packaging-guide.md` |
| 复盘记录 | `LESSONS_LEARNED.md` |
| AI 编码指南 | `AGENTS.md` |
| 架构总览 | `ARCHITECTURE.md` |
| Dev env 模板 | `.env.example.development` |
| Dev env 实际 | `.env.development` |
| Desktop env 实际 | `.env.desktop` |
| docker-compose | `docker-compose/dev/docker-compose.yml` |
| 工作区根 | `pnpm-workspace.yaml` |
| pnpm 配置 | `.npmrc` + `.bunfig.toml` |
| Desktop 历史构建 | `apps/desktop/release/mac-arm64/ugsci-desktop-dev.app` |

---

## 八、清理 / 重建命令汇总

```bash
# 清理 web 端构建
rm -rf .next public/_spa public/_spa-auth

# 清理 desktop 端构建（INC-014 必做）
rm -rf apps/desktop/{dist,build,release,release.old-*,LobeHub,desktop_v2}

# 完整重装（兜底用，~10 分钟）
pnpm run clean:node_modules  # 删所有 node_modules
pnpm install

# 桌面端专属重装
pnpm run reinstall:desktop  # 删 lockfile + 全部 node_modules + 重新 install --node-linker=hoisted

# 数据库重置（**危险**：会清空所有数据）
pnpm run dev:docker:reset

# 桌面端 release 目录验证清理
node apps/desktop/scripts/build.mjs --clean
```

---

## 九、推荐日常开发工作流

```bash
# === 一次会话开始 ===

# 1. 清理环境变量（INC-007）
unset ELECTRON_RUN_AS_NODE

# 2. 确认服务
docker ps | grep lobe-
redis-cli ping

# 3. 拉最新代码
cd /Users/lzw/Documents/UGSci
git pull --rebase
pnpm install   # 若 lockfile / 依赖有变化

# 4. 启动 dev
pnpm run dev          # Web 端
# 或
pnpm run dev:desktop  # 桌面端

# 5. 在另一终端
# 跑测试
pnpm test-app apps/desktop/src/main/core/App.test.ts  # 单文件测试（不跑全量 ~10min）

# 类型检查
pnpm run type-check

# Lint
pnpm run lint:ts

# === 修改完提交前 ===
pnpm run type-check
pnpm run lint:ts src/<改动的文件>
pnpm test-app <相关测试文件>
```

---

## 十、未完成项与风险

| 项 | 状态 | 备注 |
|---|---|---|
| RustFS / SearXNG 容器启动 | ❌ 未运行 | `pnpm run dev:docker` 启动，需先停 lobechat-pg（端口冲突） |
| 根 `node_modules/electron/dist` | ❌ 缺失 | 仅 web dev 用不到，desktop 端独立有自己的 electron |
| node-gyp / Python | ❌ 未装 | desktop 重编译原生模块才需要 |
| Rust 工具链 | ❌ 未装 | 当前 desktop 端不依赖 Rust（RustFS 镜像已提供预编译二进制） |
| Git hooks | ⚠️ 需 `prepare` | `git config core.hooksPath .githooks` |
| AI API keys | ❌ 注释 | 按需启用 OPENAI / Anthropic / DeepSeek 等 |
| 生产证书（macOS） | ❌ 无 | 本地构建无需，发版需要 CSC_LINK 等 |

**风险评估**：本机已具备 Web + Desktop 端的核心开发能力；缺失项均为可选或可绕过的。

---

> **下一步建议**：
> 1. 执行 §5.1 启动 4 个 Docker 容器（先停 lobechat-pg 释放 5432）
> 2. 执行 §5.2 启动 `pnpm run dev` 验证 Web 端
> 3. 执行 §5.2 启动 `pnpm run dev:desktop` 验证桌面端
> 4. 启用至少一个 AI Provider key（§3.1）做端到端对话验证
> 5. 若桌面端重打包，执行 `node apps/desktop/scripts/build.mjs --package`（参考 `apps/desktop/BUILD.md` §3.3）
