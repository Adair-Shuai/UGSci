# 上游同步策略（Upstream Sync Strategy）

> 本文档定义 UGSci 项目（基于 [lobehub/lobehub](https://github.com/lobehub/lobehub) 二次开发）与上游开源项目保持同步的完整工作流。
>
> **配套文档**：`ARCHITECTURE.md`（系统架构与模块定位）
>
> **适用前提**：① 有 GitHub 账号；② 尚未深度修改 LobeHub 本体；③ 紧跟上游（每 1-2 周同步）。

---

## 目录

1. [核心原则](#1-核心原则)
2. [仓库拓扑：Fork + 双 Remote](#2-仓库拓扑fork--双-remote)
3. [分支策略：三层模型](#3-分支策略三层模型)
4. [立即执行：建立 Git 仓库](#4-立即执行建立-git-仓库)
5. [日常同步流程（每 1-2 周）](#5-日常同步流程每-1-2-周)
6. [定制隔离规范](#6-定制隔离规范)
7. [冲突处理手册](#7-冲突处理手册)
8. [同步前检查清单](#8-同步前检查清单)
9. [常见问题](#9-常见问题)

---

## 1. 核心原则

| 原则 | 说明 |
|---|---|
| **上游镜像零污染** | `canary` 分支永远是上游 `lobehub/lobehub` 的 1:1 镜像，**禁止直接提交任何定制代码**到这个分支。 |
| **定制尽量"新增"而非"修改"** | 新建文件 >> 修改上游文件。新增文件不会产生冲突，修改文件每次同步都要解冲突。 |
| **修改必打标记** | 确需修改上游文件时，在改动处加 `// UGS-MODIFY: <原因>` 注释，便于冲突定位和 review。 |
| **小步快跑** | 每 1-2 周同步一次，不要攒几个月再同步——冲突会指数级增长。 |
| **Rebase 优先** | 定制分支用 `rebase` 而非 `merge` 上游，保持线性历史，便于追踪"哪些是我的改动"。 |
| **备份再同步** | 同步前必须 `git push` 到 origin，确保本地工作有云端备份。 |

---

## 2. 仓库拓扑：Fork + 双 Remote

```
┌─────────────────────┐       ┌─────────────────────┐
│  lobehub/lobehub    │       │  <你>/lobehub (fork)│
│  (upstream, 只读)   │       │  (origin, 可写)     │
│  canary ◯───────→  │ fetch │  canary ◯ (镜像)    │
│  main   ◯           │ ←─────│  main   ◯ (镜像)    │
└─────────────────────┘       │  ugs/custom ◯ ←─ 你的定制基线
                              │  ugs/feat-*  ◯ ←─ 功能分支
                              └─────────────────────┘
                                       ↑
                                ┌──────┴──────┐
                                │  本地工作区  │
                                │  (git clone) │
                                └─────────────┘
```

| Remote | URL | 权限 | 用途 |
|---|---|---|---|
| `origin` | `https://github.com/<你的GitHub账号>/lobehub.git` | 可写 | 你的 fork，推送定制代码 |
| `upstream` | `https://github.com/lobehub/lobehub.git` | 只读 | 上游原仓库，拉取更新 |

---

## 3. 分支策略：三层模型

```
upstream/canary ──●──●──●──●──●──●──●──●──●──●──●── (上游持续迭代)
                                  │
origin/canary (镜像) ─────────────●──●──●──●──●──●── (定期 fast-forward 同步)
                                  │
ugs/custom (定制基线) ────────────●──●──●──●──●──●── (rebase 到最新 canary)
                                  │      │      │
ugs/feat-storage-tool ───────────●      │      │
ugs/feat-gas-ui ────────────────────────●      │
ugs/feat-kg-domain ────────────────────────────● (从 ugs/custom 派生，合并回 ugs/custom)
```

### 三层分支职责

| 分支 | 来源 | 可直接提交？ | 同步方式 | 用途 |
|---|---|---|---|---|
| `canary` | `upstream/canary` | **否**（仅 fast-forward） | `git merge --ff-only upstream/canary` | 上游镜像，定制基线的"地基" |
| `ugs/custom` | `canary` | **是**（定制提交） | `git rebase canary` | 定制基线，所有功能分支的母分支 |
| `ugs/feat-*` | `ugs/custom` | **是** | 完成后 `merge --no-ff` 回 `ugs/custom` | 具体功能开发 |

### 为什么用 rebase 而不是 merge？

- **线性历史**：`ugs/custom` 的 log 永远是 `[上游commit] → [你的commit] → [你的commit]`，一眼看出哪些是定制。
- **冲突一次化**：rebase 把你的每个定制 commit 依次重放到新基线，冲突在"你的改动 vs 上游改动"层面解决，不会引入 merge commit 噪声。
- **代价**：rebase 会改写历史，需要 `--force-with-lease` 推送。**只要 ugs/custom 只是你自己用，这没问题。**

> ⚠️ **如果 ugs/custom 被多人协作**：改用 `merge upstream/canary` 进 `ugs/custom`，保留 merge commit，避免 force push 影响他人。

---

## 4. 立即执行：建立 Git 仓库

> **前置**：当前 `C:\Users\shuai\Documents\UGSci` 目录还不是 git 仓库（无 `.git`）。下面步骤把它变成基于 fork 的正规仓库。

### 步骤 1：在 GitHub 上 fork

1. 浏览器打开 https://github.com/lobehub/lobehub
2. 右上角点 **Fork** → 选择你的账号 → Fork 完成
3. 你将得到 `https://github.com/<你的账号>/lobehub`

### 步骤 2：备份当前目录的本地配置

当前目录有些文件不在上游仓库里（如 `.agents/`、`.claude/`、`.codex/`、`.cursor/`、`.conductor/`、`ARCHITECTURE.md`、`UPSTREAM_SYNC.md` 等），需要先备份。

```bash
# 在 C:/Users/shuai/Documents/UGSci 下
# 把所有"非上游"文件备份到上一级
mkdir -p ../UGSci-backup
# 备份你自己的文档与 AI 工具配置（这些不在 lobehub 上游里）
cp ARCHITECTURE.md UPSTREAM_SYNC.md ../UGSci-backup/ 2>/dev/null
cp -r .agents .claude .codex .cursor .conductor .codex-corepack ../UGSci-backup/ 2>/dev/null
# 备份储气库相关脚本（如果你放进了这个目录）
cp -r analyze_storage.py preview_noise.py noise_data ../UGSci-backup/ 2>/dev/null
```

> **判断"非上游文件"的快捷方法**：clone 完上游后用 `git status` 一眼就能看出哪些是 untracked 的。

### 步骤 3：把当前目录改名为临时目录

```bash
cd ..
mv UGSci UGSci-old
```

### 步骤 4：clone 你的 fork

```bash
# 替换 <你的账号>
git clone https://github.com/<你的账号>/lobehub.git UGSci
cd UGSci
```

### 步骤 5：配置 upstream 并切换到 canary

```bash
# 添加上游 remote
git remote add upstream https://github.com/lobehub/lobehub.git

# 拉取上游所有分支
git fetch upstream

# 切到 canary（上游开发分支，见 AGENTS.md）
git checkout canary

# 确保 origin/canary 与 upstream/canary 同步
git pull upstream canary
git push origin canary
```

### 步骤 6：创建定制基线分支

```bash
# 从 canary 派生你的定制基线
git checkout -b ugs/custom
git push -u origin ugs/custom
```

### 步骤 7：恢复本地配置

```bash
# 把备份的本地文件拷回来
cp ../UGSci-backup/ARCHITECTURE.md ../UGSci-backup/UPSTREAM_SYNC.md .
cp -r ../UGSci-backup/.agents ../UGSci-backup/.claude ../UGSci-backup/.codex ../UGSci-backup/.cursor ../UGSci-backup/.conductor . 2>/dev/null
# 储气库脚本
cp ../UGSci-backup/analyze_storage.py ../UGSci-backup/preview_noise.py . 2>/dev/null
cp -r ../UGSci-backup/noise_data . 2>/dev/null

# 把这些本地专属文件加到 .gitignore，避免误提交回 fork
# （见下一节"定制隔离规范"）
```

### 步骤 8：验证

```bash
git remote -v
# 应看到：
# origin    https://github.com/<你的账号>/lobehub.git (fetch/push)
# upstream  https://github.com/lobehub/lobehub.git (fetch/push)

git branch -a
# 应看到：canary, ugs/custom, remotes/origin/*, remotes/upstream/*

git log --oneline -3
# 应看到上游最新的 commit
```

### 步骤 9：安装依赖并确认可运行

```bash
pnpm install
bun run dev:spa   # 验证 SPA 能起来
```

确认无误后，可以删除 `../UGSci-old` 和 `../UGSci-backup`。

---

## 5. 日常同步流程（每 1-2 周）

> **同步日**：建议固定每周一或周五执行，养成节奏。

### 5.1 同步前准备

```bash
# 0. 确保工作区干净
cd C:/Users/shuai/Documents/UGSci
git status   # 必须是 clean

# 1. 推送所有本地分支到 origin（备份）
git push origin --all

# 2. 拉取上游最新
git fetch upstream
git fetch upstream --tags

# 3. 查看上游这周改了什么
git log --oneline canary..upstream/canary | head -30
# 查看涉及的文件范围
git diff --stat canary..upstream/canary | tail -20
```

### 5.2 更新镜像分支 canary

```bash
git checkout canary
git merge --ff-only upstream/canary   # 只允许快进，保证 1:1 镜像
git push origin canary
```

> 如果 `--ff-only` 失败，说明 canary 被污染过（有人直接提交了）。用 `git reset --hard upstream/canary` 强制对齐，然后 `git push --force-with-lease origin canary`。

### 5.3 同步定制基线 ugs/custom（核心步骤）

```bash
git checkout ugs/custom

# 关键：rebase 到最新 canary
git rebase canary
```

**可能出现两种结果**：

#### 情况 A：无冲突，rebase 顺利完成

```bash
git push --force-with-lease origin ugs/custom
# 完成！
```

#### 情况 B：有冲突，需要解决

见下一节「冲突处理手册」。

### 5.4 同步功能分支（如果存在）

```bash
# 对每个活跃的功能分支
git checkout ugs/feat-storage-tool
git rebase ugs/custom
# 解决冲突...
git push --force-with-lease origin ugs/feat-storage-tool
```

### 5.5 验证

```bash
# 类型检查
bun run type-check

# 跑关键单测（不要跑全量，太慢）
bunx vitest run --silent='passed-only' 'tests/store/agent'

# 启动开发服务器确认能跑
bun run dev:spa
```

### 5.6 记录同步

在 `C:\Users\shuai\Documents\UGSci\.workbuddy\memory\YYYY-MM-DD.md` 追加：

```
## 上游同步
- 同步自 upstream/canary @ <commit hash>
- 上游变更：<简述，如"新增 XX 功能，修复 YY bug">
- 冲突文件：<列出>
- 验证：type-check ✓ / dev:spa ✓
```

---

## 6. 定制隔离规范

> **核心思想**：把定制代码集中在"新增文件"里，对上游文件的修改降到最低。

### 6.1 安全区（优先在这里做定制，几乎不会冲突）

| 目录 | 适合的定制 |
|---|---|
| `packages/builtin-tool-ugs-*/` | 新建储气库领域工具包（推荐主战场） |
| `packages/business/ugs-*/` | 业务定制子包 |
| `src/features/Ugs*/` | 储气库领域 UI 组件 |
| `src/store/ugs/` | 储气库专属 store（如有） |
| `src/services/ugs/` | 储气库专属服务 |
| `packages/database/src/schemas/ugs_*.ts` | 储气库专属数据表（独立 schema 文件） |
| 新增的脚本/配置 | `scripts/ugs-*.ts`、独立配置文件 |

### 6.2 风险区（修改这里会高频冲突，尽量避免）

| 目录/文件 | 风险 | 替代方案 |
|---|---|---|
| `src/spa/router/desktopRouter.config.tsx` | 上游常改路由树 | 用 `src/business/client/BusinessDesktopRoutes` 注入扩展点 |
| `apps/server/src/routers/lambda/index.ts` | 上游常聚合新 router | 用 `@/business/server/lambda-routers/*` 注入 |
| `packages/database/src/schemas/index.ts` | 上游常加 schema | 把你的 schema 放独立文件，在 `index.ts` 末尾追加一行 import |
| `packages/const/src/index.ts` | 上游常 re-export | 同上，末尾追加 |
| `package.json` 的 dependencies | 上游频繁升级 | 用 `pnpm.overrides` 而非直接改 dependencies |
| `tsconfig.json` paths | 极少改但很关键 | 尽量复用现有别名，不新增 |

### 6.3 不得不修改上游文件时的规范

1. **最小化改动**：只改必要的几行，不要顺手重构。
2. **打标记**：

   ```typescript
   // UGS-MODIFY: 储气库需要注入静压字段，原版只有油压套压
   // 关联：packages/database/src/schemas/ugs_well.ts
   export interface AgentRecord {
     // ...原字段
     staticPressure?: number;  // UGS-ADD
   }
   // UGS-MODIFY-END
   ```

3. **集中修改**：同类修改尽量合并到一个 commit，便于 rebase 时整体处理。
4. **登记到定制清单**：维护 `UGS_CUSTOMIZATIONS.md`（见下）。

### 6.4 维护定制清单

在项目根目录创建 `UGS_CUSTOMIZATIONS.md`，记录所有对上游文件的修改：

```markdown
# UGSci 定制清单

## 修改的上游文件

| 文件 | 改动说明 | 关联定制 | 同步冲突风险 |
|---|---|---|---|
| src/types/agent.ts | 新增 staticPressure 字段 | ugs_well schema | 低 |
| packages/database/src/schemas/index.ts | 追加 ugs_well 导入 | ugs_well schema | 低（末尾追加） |

## 新增的定制文件

| 文件/目录 | 用途 |
|---|---|
| packages/builtin-tool-ugs-storage/ | 储气库产能分析工具 |
| src/features/UgsStorageReport/ | 储气库报告 UI |
| scripts/ugs-*.ts | 储气库专属脚本 |
```

每次同步后 review 这个清单，确认上游变更是否影响了你的定制点。

---

## 7. 冲突处理手册

### 7.1 rebase 冲突通用流程

```bash
git rebase canary
# CONFLICT (content): Merge conflict in src/xxx.ts

# 1. 查看所有冲突文件
git status

# 2. 逐个打开冲突文件，搜索 <<<<<<< 标记
#    保留你的定制（带 UGS-MODIFY 标记的部分），融合上游的新逻辑

# 3. 解决后标记
git add src/xxx.ts

# 4. 继续 rebase
git rebase --continue

# 5. 如果中途想放弃
git rebase --abort
```

### 7.2 冲突分类与策略

| 冲突类型 | 典型场景 | 处理策略 |
|---|---|---|
| **你改的行 vs 上游改的行** | 你给某函数加了参数，上游也改了同函数 | 人工融合，保留双方意图。用 `git log --oneline -1 <上游commit>` 看上游为什么改 |
| **你加了字段 vs 上游重构了文件** | 你在 interface 加字段，上游把 interface 拆分了 | 重新定位你的字段该放哪个新 interface |
| **上游删了你改的文件** | 上游废弃了某模块 | 评估你的定制是否还需要，可能要迁移到新模块 |
| **上游大重构** | 如 v2 → v3 架构升级 | 暂停同步，先在 fork 上拉个分支试跑，确认升级方案后再 rebase |

### 7.3 处理大重构冲突（进阶）

如果上游某次更新改动巨大（如 `git diff --stat canary..upstream/canary` 显示几百个文件）：

```bash
# 不要直接 rebase，先评估
git fetch upstream

# 创建一个测试分支
git checkout -b ugs/upgrade-test canary
git merge upstream/canary   # 用 merge 看冲突全貌

# 冲突太多无法解决？放弃这次同步，等下个小版本
git checkout ugs/custom
git branch -D ugs/upgrade-test
```

**策略**：大重构版本（如 x.0.0）通常等 x.0.1 / x.0.2 修完 bug 再跟。

### 7.4 善用工具

```bash
# 配置 mergetool（推荐 VSCode）
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'

# rebase 冲突时
git mergetool
```

---

## 8. 同步前检查清单

每次同步前过一遍这个清单，避免低级错误：

- [ ] 工作区 clean（`git status` 无未提交改动）
- [ ] 所有分支已 push 到 origin（`git push origin --all`）
- [ ] 已 fetch upstream（`git fetch upstream --tags`）
- [ ] 已 review 上游变更（`git log --oneline canary..upstream/canary`）
- [ ] 上游无重大破坏性变更（否则考虑跳过本次同步）
- [ ] 当前在 `ugs/custom` 分支
- [ ] 有足够时间处理潜在冲突（不要赶时间）

同步后：

- [ ] `bun run type-check` 通过
- [ ] 关键单测通过
- [ ] `bun run dev:spa` 能启动
- [ ] `ugs/custom` 已 push（`--force-with-lease`）
- [ ] 功能分支已 rebase 并 push
- [ ] `UGS_CUSTOMIZATIONS.md` 已 review
- [ ] `.workbuddy/memory/YYYY-MM-DD.md` 已记录

---

## 9. 常见问题

### Q1：我不小心直接在 canary 上提交了定制代码怎么办？

```bash
# 把那个提交"摘"到 ugs/custom
git checkout ugs/custom
git cherry-pick <commit-hash>

# 把 canary 重置回镜像状态
git checkout canary
git reset --hard upstream/canary
git push --force-with-lease origin canary
```

### Q2：rebase 后 push 被拒绝？

rebase 改写了历史，需要强推：

```bash
git push --force-with-lease origin ugs/custom
```

**永远用 `--force-with-lease` 而非 `--force`**：前者会在远端被别人更新时拒绝推送，防止覆盖他人工作。

### Q3：上游改了 `.env.example`，我的 `.env` 怎么办？

`.env` 不进 git（在 `.gitignore` 里），不会被覆盖。但同步后要 diff 一下 `.env.example` 看有没有新增必要的环境变量，手动补到 `.env`。

### Q4：上游升级了依赖版本，我 `pnpm install` 报错？

```bash
# 先清干净
rm -rf node_modules
pnpm -r exec rm -rf node_modules
rm pnpm-lock.yaml

# 重新装
pnpm install
```

如果还有问题，看 `package.json` 的 `overrides`/`pnpm.overrides` 是否需要同步更新。

### Q5：我想同步某个特定 commit（不等同步日）？

```bash
git fetch upstream
git checkout ugs/custom
git cherry-pick <upstream-commit-hash>
# 解决冲突...
git push origin ugs/custom
```

### Q6：如何查看"我的定制"到底改了哪些上游文件？

```bash
# ugs/custom 相对于 canary 的所有改动
git diff canary..ugs/custom --stat

# 只看改了哪些上游文件（排除新增文件）
git diff canary..ugs/custom --diff-filter=M --name-only
```

### Q7：同步后跑不起来，怎么回滚？

```bash
# 回到同步前的 ugs/custom
git reflog
# 找到 rebase 前的状态，类似：
# abc1234 HEAD@{5}: rebase finished: ... onto def5678

git reset --hard abc1234
git push --force-with-lease origin ugs/custom
```

`git reflog` 是你的后悔药，90% 的"搞砸了"都能用它救回来。

---

## 附录：推荐的一次同步完整脚本

把下面存成 `scripts/ugs-sync.sh`（手动执行，不要自动化——同步需要人工判断）：

```bash
#!/bin/bash
set -e

echo "=== 1. 检查工作区 ==="
git status --porcelain && echo "工作区不干净，请先提交或 stash" && exit 1

echo "=== 2. 备份到 origin ==="
git push origin --all

echo "=== 3. 拉取上游 ==="
git fetch upstream --tags

echo "=== 4. 上游变更概览 ==="
git log --oneline canary..upstream/canary | head -20
git diff --stat canary..upstream/canary | tail -10

echo "=== 5. 更新镜像 canary ==="
git checkout canary
git merge --ff-only upstream/canary
git push origin canary

echo "=== 6. Rebase 定制基线 ==="
git checkout ugs/custom
git rebase canary

echo "=== 7. 推送定制基线 ==="
git push --force-with-lease origin ugs/custom

echo "=== 8. 验证 ==="
bun run type-check

echo "=== 同步完成 ==="
echo "如果 type-check 失败，用 git rebase --abort 回滚，或手动修复后 git rebase --continue"
```

---

*本文档与 `ARCHITECTURE.md` 配套使用。同步流程有任何调整，请同步更新本文档。*
