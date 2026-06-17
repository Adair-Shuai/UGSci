# UGSci 专家体系架构（Expert System Architecture）

> 本文档定义 UGSci 储气库专家体系的完整架构：从单专家（Agent 型）到专家团（Team 型）的设计、数据模型、落地路径与关键代码索引。
>
> **配套文档**：`ARCHITECTURE.md`（系统架构）、`UPSTREAM_SYNC.md`（上游同步策略）
>
> **核心结论**：LobeHub 原生 `GroupOrchestration` 机制与 WorkBuddy 专家团同构，UGSci **无需自研编排引擎**，只需配置预设团队即可实现专家团能力。

---

## 目录

1. [设计参照：WorkBuddy 三层专家模型](#1-设计参照workbuddy-三层专家模型)
2. [LobeHub 原生机制剖析](#2-lobehub-原生机制剖析)
3. [同构对照：WorkBuddy 专家团 ≡ LobeHub GroupOrchestration](#3-同构对照workbuddy-专家团--lobehub-grouporchestration)
4. [UGSci 储气库专家体系设计](#4-ugsci-储气库专家体系设计)
5. [数据模型](#5-数据模型)
6. [实施路线图](#6-实施路线图)
7. [关键代码索引](#7-关键代码索引)
8. [风险与决策点](#8-风险与决策点)

---

## 1. 设计参照：WorkBuddy 三层专家模型

WorkBuddy（腾讯桌面 AI 工作台）将"专家能力"分为三层递进结构：

```
Skill（工具能力）   →   专家（Agent 型）   →   专家团（Team 型）
让 AI 能做某件事         懂某领域的 AI 角色       自动拆解·并行·整合
能力                     能力 + 经验             多位专家 + 协作流程
```

| 层级 | 组成 | 用户语义 | 调用方式 |
|---|---|---|---|
| **Skill** | 工具能力（如 PDF 解析、PPT 生成） | "让 AI 能做某件事" | 工具调用 |
| **专家** | 人设 + 方法论 + 工具链 | "请了个顾问" | 召唤 → 专属对话 |
| **专家团** | 团长（组织者）+ 若干子专家 | "拉了个项目组" | 召唤团 → 只跟团长对话 |

### 专家团的关键语义（与 UGSci 设计强相关）

- **团队结构预设**：哪个专家进团、谁是团长，是**产品设计时确定**的，不是运行时动态路由。
- **用户只与团长对话**：用户描述任务 → 团长接收 → 团长拆解并分派 → 子专家执行 → 团长整合输出。
- **子专家过程可见**：用户能看到子专家的发言和工作进度（透明协作，非黑盒）。
- **调度范围封闭**：团长只在预设成员范围内调度，不会从外部动态拉人。

> **本质**：这是经典的 **Manager Pattern**（主管-执行者模式），不是动态多智能体路由。

---

## 2. LobeHub 原生机制剖析

LobeHub 内置两套与专家能力相关的机制，**与 WorkBuddy 三层模型同构**：

### 2.1 Builtin Agent（对应"专家"层）

**位置**：`packages/builtin-agents/`

```
types.ts                       ← BUILTIN_AGENT_SLUGS 联合类型
index.ts                       ← BUILTIN_AGENTS map 注册
src/agents/<slug>/
  ├── index.ts                 ← 元数据（avatar、runtime、slug）
  └── systemRole.ts            ← 系统提示词（人设 + 方法论）
```

**调用方式**：通过 `useInitBuiltinAgent(slug)` hook，按 slug 程序化创建 agent 记录入库。

**关键限制**：光在 `BUILTIN_AGENTS` map 里注册一条，**不会**让它在任何 UI 页面上出现。必须在代码里显式调用 init hook，agent 才会进 `builtinAgentIdMap`，进而可被 UI 使用。

现有内置 agent 都是绑定到**功能入口**的（非用户挑选）：

| Slug | 调用点 | 用途 |
|---|---|---|
| `inbox` | `StoreInitialization` | 默认助手 |
| `taskAgent` | `TaskAgentProvider` | 任务管理 |
| `pageAgent` | `PageAgentProvider` | 页面副驾驶 |
| `agentBuilder` | `AgentBuilder` | 助手构建器 |
| `groupAgentBuilder` | `homeInput action` | 群组助手构建 |
| `webOnboarding` | `Onboarding/Agent` | 网页引导 |

### 2.2 GroupOrchestration（对应"专家团"层）

**位置**：`src/store/chat/agents/GroupOrchestration/`

这是 LobeHub 的多 agent 协作引擎，采用 **Supervisor-Executor 双层状态机**架构：

```
┌─────────────────────────────────────────────────────────────┐
│  Supervisor (State Machine)                                 │
│  接收 ExecutorResult → 决策 → 返回 SupervisorInstruction     │
│  由团长 agent 的 LLM 推理驱动                                │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Executor (Execution Layer)                                 │
│  接收 SupervisorInstruction → 执行 → 返回 ExecutorResult     │
└─────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ call_supervisor│  │  call_agent      │  │ parallel_call   │
│ 团长思考决策   │  │  调单个子专家     │  │ _agents         │
│ isSupervisor  │  │  注入 instruction │  │ 并行广播多专家  │
│ =true         │  │  作为虚拟 user 消息│  │                 │
└───────────────┘  └──────────────────┘  └─────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ delegate      │  │ exec_async_task  │  │ batch_exec      │
│ 完全委派       │  │ 子专家后台异步   │  │ _async_tasks    │
│ （交出控制权） │  │ 长耗时任务       │  │ 批量并行异步    │
└───────────────┘  └──────────────────┘  └─────────────────┘
```

### 六种 Executor 详解

| Executor | 用途 | UGSci 场景示例 |
|---|---|---|
| `call_supervisor` | 团长接收任务、思考、决策 | 团长分析"评估呼图壁库容"任务，决定调用哪些子专家 |
| `call_agent` | 调用单个子专家，注入 instruction | 团长让 ugs-capacity 做 P/Z 物质平衡分析 |
| `parallel_call_agents` | 并行广播给多个子专家 | 团长同时让 ugs-bpinn 和 ugs-integrity 并行评估 |
| `delegate` | 完全委派控制权给某子专家 | 团长把"测井解释"全权交给 ugs-logging |
| `exec_async_task` | 子专家后台异步长任务 | ugs-simulation 跑数值模拟（30 分钟级） |
| `batch_exec_async_tasks` | 批量并行异步任务 | 同时跑多口井的产能预测 |

### 关键实现细节

1. **团长标记**：`call_supervisor` 执行时设 `isSupervisor: true`，UI 据此区分团长发言。
2. **指令注入**：团长调用子专家时，instruction 作为虚拟 user 消息注入：`<speaker name="Supervisor" />\n{instruction}`，让子专家知道"这是团长派下来的活"。
3. **进度可见**：异步任务创建 `role: 'task'` 的占位消息，通过 `taskDetail` 字段轮询更新进度。
4. **取消传播**：操作可被取消，状态机检查 `operations[operationId].status === 'cancelled'` 并终止轮询。

---

## 3. 同构对照：WorkBuddy 专家团 ≡ LobeHub GroupOrchestration

| 维度 | WorkBuddy 专家团 | LobeHub GroupOrchestration | 同构？ |
|---|---|---|---|
| **团队结构** | 产品预设固定 | 用户创建时指定 / 可预设 | ✅ |
| **团长** | 组织者 | `role='moderator'` 的 agent / Supervisor | ✅ |
| **子专家** | 固定成员 | `role='participant'` 的 agent | ✅ |
| **用户交互** | 只跟团长对话 | `call_supervisor` 入口，子专家发言作为消息插入 | ✅ |
| **子专家可见性** | 能看到发言和进度 | `call_agent` 产生消息 + `role: 'task'` 进度消息 | ✅ |
| **调度范围** | 仅限预设成员 | 仅限群组成员 | ✅ |
| **并行执行** | 支持 | `parallel_call_agents` / `batch_exec_async_tasks` | ✅ |
| **异步长任务** | 支持 | `exec_async_task` + 后端 thread + 轮询 | ✅ |
| **本质** | Manager Pattern | Supervisor-Executor 状态机 | ✅ |

**结论**：两者底层是同一套模式。UGSci 要实现"储气库专家团"，**直接用 LobeHub 原生 GroupOrchestration 即可**，无需自研编排层。

---

## 4. UGSci 储气库专家体系设计

### 4.1 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│  第三层：专家团（Team 型）— 预设固定团队                     │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ 库容评估团        │  │ 注采优化团        │  ...           │
│  │ 团长 + 3 子专家  │  │ 团长 + 3 子专家  │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                             │ 调用
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  第二层：单专家（Agent 型）— 13 个 ugs-* 专家                │
│  评估类(3)  运行类(3)  机理类(3)  工程类(3)  辅助类(1)       │
│  已实现于 packages/builtin-agents/src/agents/ugs-*/          │
└─────────────────────────────────────────────────────────────┘
                             │ 依赖
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  第一层：工具能力（Skill / MCP）                             │
│  NeqSim (80+ 工具)  ·  pyResToolbox (80+ 工具)              │
│  已在 13 个专家的 systemRole 中映射                          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 13 个子专家清单（已实现）

| 分类 | Slug | Emoji | 角色 |
|---|---|---|---|
| 评估类 | `ugs-capacity` | 📊 | 库容评估（已嵌入 SY/T 7686-2023 规范） |
| 评估类 | `ugs-deliverability` | ⚡ | 产能评估 |
| 评估类 | `ugs-params` | ⚙️ | 储层物性参数 |
| 运行类 | `ugs-injection` | 🔄 | 注采运行 |
| 运行类 | `ugs-peaking` | 🏔️ | 调峰能力 |
| 运行类 | `ugs-allocation` | 📐 | 配产配注 |
| 机理类 | `ugs-bpinn` | 🧠 | B-PINN 不确定性 |
| 机理类 | `ugs-pvt` | 🔬 | PVT 相态 |
| 机理类 | `ugs-rate-transient` | 📉 | 产量递减/RTA |
| 工程类 | `ugs-logging` | 📡 | 测井解释 |
| 工程类 | `ugs-simulation` | 🖥️ | 数值模拟 |
| 工程类 | `ugs-integrity` | 🛡️ | 井筒完整性 |
| 辅助类 | `ugs-literature` | 📚 | 文献检索 |

### 4.3 专家团设计（待实现）

预设若干固定团队，每团 = 1 团长 + N 子专家。团长也是 builtin agent，slug 以 `ugs-orchestrator-*` 命名。

#### 团长 agent 设计规范

团长的 systemRole 必须包含以下要素：

```markdown
# 角色
你是 {团队名} 的团长（Supervisor），负责接收用户任务、拆解、分派给子专家、整合交付。

# 你可调度的子专家
- {slug1}：{能力简述}
- {slug2}：{能力简述}
- ...

# 工作流程
1. 分析任务，判断需要哪些子专家介入
2. 用 speak 工具向用户说明你的拆解计划
3. 用 call_agent / parallel_call_agents 调度子专家
4. 收集子专家结果，整合成最终交付
5. 如需长耗时计算，用 exec_async_task 后台执行

# 约束
- 你只在自己团队的子专家范围内调度，不跨界
- 子专家的专业结论你不得擅自修改，只能整合
- 涉及多专家矛盾结论时，列出分歧让用户决策
```

#### 预设专家团清单（建议）

| 团队 | 团长 slug | 子专家 | 典型任务 |
|---|---|---|---|
| 库容评估团 | `ugs-orchestrator-capacity` | ugs-capacity + ugs-bpinn + ugs-integrity | "评估呼图壁储气库库容并给出不确定性区间" |
| 注采优化团 | `ugs-orchestrator-injection` | ugs-injection + ugs-peaking + ugs-allocation | "优化本月配产配注方案" |
| 建库评价团 | `ugs-orchestrator-evaluation` | ugs-capacity + ugs-deliverability + ugs-params + ugs-pvt | "评价某储气库建库可行性" |
| 数值模拟团 | `ugs-orchestrator-simulation` | ugs-simulation + ugs-params + ugs-pvt + ugs-logging | "搭建地质模型并跑注采预测" |
| 综合研究团 | `ugs-orchestrator-research` | ugs-literature + ugs-capacity + ugs-bpinn + ugs-rate-transient | "某课题文献综述 + 方法论搭建" |

> 团队清单可按业务需求扩展，新增团队只需：① 建团长 agent；② 在 `chat_groups_agents` 表关联成员。

### 4.4 UI 入口设计

#### 专家市场页（单专家 + 专家团统一入口）

**路由**：`/ugs-experts`（需在 `desktopRouter.config.tsx` 和 `desktopRouter.config.desktop.tsx` **双写**同步）

**页面结构**：

```
/ugs-experts
├── 顶部分类 Tab：全部 | 评估 | 运行 | 机理 | 工程 | 辅助 | 专家团
├── 单专家区（默认展示）
│   └── 卡片网格：13 张卡片，按分类分组
│       每张卡片：emoji + 名称 + 一句话能力 + "召唤"按钮
└── 专家团区（Tab 切换后展示）
    └── 团队卡片：团名 + 团长 + 成员头像组 + 典型任务示例 + "召唤团队"按钮
```

**点击行为**：
- 单专家卡片 → `ensureBuiltinAgentHydrated(slug)` → `navigate('/agent/{agentId}')`
- 专家团卡片 → `ensureBuiltinGroupHydrated(groupSlug)` → `navigate('/group/{groupId}')`

#### 侧边栏常驻（可选，二期）

首页 agent 列表加"UGS 专家"分组，数据来自 `builtinAgentIdMap`，方便任意位置快速切换。

---

## 5. 数据模型

### 5.1 现有表（无需改 schema）

LobeHub 已有的表完全覆盖 UGSci 需求：

```sql
-- agents 表：存所有 agent（含 13 个 ugs 子专家 + N 个团长）
--   关键字段：id, slug, systemRole, avatar, model, provider
--   ugs 子专家 slug: 'ugs-capacity' 等
--   团长 slug: 'ugs-orchestrator-capacity' 等

-- chat_groups 表：存专家团
--   关键字段：id, title, config (jsonb, 含团队配置)

-- chat_groups_agents 表：团队-成员关联
--   关键字段：chatGroupId, agentId, role ('moderator' | 'participant'), order
```

### 5.2 预设团队种子数据

专家团需要"预设"，有两种实现路径：

| 方案 | 实现 | 优点 | 缺点 |
|---|---|---|---|
| **A. 启动时 seed** | 写 seed 脚本，应用启动检测并创建 chat_groups + 关联记录 | 灵活，可随版本迭代 | 需写幂等逻辑 |
| **B. Builtin Groups** | 仿 builtin-agents，新建 `packages/builtin-groups/` 包，静态定义团队结构 | 与现有 builtin-agents 模式一致 | 需新增一套 group init 机制 |

**推荐方案 A**：复用 `chat_groups` 表 + seed 脚本，不动 schema、不新建包。seed 脚本放 `scripts/seed_ugs_expert_teams.ts`。

### 5.3 数据流

```
应用启动
  │
  ├── StoreInitialization.tsx
  │     └── useInitBuiltinAgent(slug) × 13   ← 子专家入库
  │     └── useInitBuiltinAgent(slug) × N    ← 团长入库
  │
  └── seed_ugs_expert_teams.ts（首次运行）
        └── 检查 chat_groups 是否已有 ugs 团队记录
        └── 无则创建：INSERT chat_groups + chat_groups_agents
        └── 团长 role='moderator'，子专家 role='participant'

用户访问 /ugs-experts
  │
  ├── 读 BUILTIN_AGENTS（13 子专家 + N 团长定义）渲染卡片
  └── 读 chat_groups（已 seed 的团队）渲染专家团卡片

用户点击单专家
  └── ensureBuiltinAgentHydrated(slug) → navigate('/agent/{id}')

用户点击专家团
  └── navigate('/group/{groupId}')
        └── GroupOrchestration 引擎接管
        └── Supervisor（团长）决策 → 调度子专家 → 整合输出
```

---

## 6. 实施路线图

### 阶段 0：补缺口（必做，所有 UI 入口的前提）

| 任务 | 文件 | 说明 |
|---|---|---|
| 新建 `useInitUgsExperts` hook | `src/hooks/useInitUgsExperts.ts` | 遍历 13 个 ugs slug 批量 init |
| 接入启动流程 | `src/layout/GlobalProvider/StoreInitialization.tsx` | 调用上述 hook |

### 阶段 1：专家市场页（单专家可见可召唤）

| 任务 | 文件 | 说明 |
|---|---|---|
| 路由注册（双写） | `src/spa/router/desktopRouter.config.tsx` + `.desktop.tsx` | 新增 `/ugs-experts` |
| 页面组件 | `src/features/UgsExperts/index.tsx` | Tab + 卡片网格 |
| 卡片组件 | `src/features/UgsExperts/ExpertCard.tsx` | emoji + 名称 + 能力 + 召唤按钮 |
| 导航入口 | `src/layout/Sidebar/Footer` 或 `Header` | 加"专家"链接 |

### 阶段 2：团长 agent + 预设专家团

| 任务 | 文件 | 说明 |
|---|---|---|
| 团长 agent 定义 | `packages/builtin-agents/src/agents/ugs-orchestrator-*/` | 每团一个目录，含 index.ts + systemRole.ts |
| 注册团长 | `packages/builtin-agents/src/types.ts` + `index.ts` | 加 slug + 注册 |
| seed 脚本 | `scripts/seed_ugs_expert_teams.ts` | 创建 chat_groups + 关联记录 |
| 专家团卡片 | `src/features/UgsExperts/TeamCard.tsx` | 团名 + 成员头像组 + 召唤按钮 |

### 阶段 3（可选）：侧边栏常驻 + 体验优化

| 任务 | 说明 |
|---|---|
| 首页 agent 列表加"UGS 专家"分组 | 数据来自 `builtinAgentIdMap` |
| 专家团进度可视化增强 | 基于 `role: 'task'` 消息渲染进度条 |
| 团长模型选型配置 | 团长用强推理模型（DeepSeek-R1 / Claude），子专家可用便宜模型 |

---

## 7. 关键代码索引

### 7.1 专家定义层

| 文件 | 作用 |
|---|---|
| `packages/builtin-agents/src/types.ts` | `BUILTIN_AGENT_SLUGS` 联合类型 |
| `packages/builtin-agents/src/index.ts` | `BUILTIN_AGENTS` map 注册 |
| `packages/builtin-agents/src/agents/ugs-*/index.ts` | 单专家元数据 |
| `packages/builtin-agents/src/agents/ugs-*/systemRole.ts` | 单专家系统提示词 |

### 7.2 专家初始化与调用

| 文件 | 作用 |
|---|---|
| `src/hooks/useInitBuiltinAgent.ts` | 单个 builtin agent 初始化 hook |
| `src/store/agent/slices/builtin/action.ts` | `useInitBuiltinAgent` / `refreshBuiltinAgent` 实现 |
| `src/store/agent/selectors/builtinAgentSelectors.ts` | builtin agent 查询 selectors |
| `src/layout/GlobalProvider/StoreInitialization.tsx` | 应用启动时批量 init 入口 |

### 7.3 专家团引擎（GroupOrchestration）

| 文件 | 作用 |
|---|---|
| `src/store/chat/agents/GroupOrchestration/createGroupOrchestrationExecutors.ts` | **核心**：6 种 Executor 实现（1117 行） |
| `src/store/chat/slices/aiAgent/actions/groupOrchestration.ts` | GroupOrchestration action 入口 |
| `src/store/chat/slices/message/supervisor.ts` | Supervisor 消息处理 |
| `packages/database/src/schemas/chatGroup.ts` | `chat_groups` + `chat_groups_agents` schema |

### 7.4 群组 UI

| 文件 | 作用 |
|---|---|
| `src/store/home/slices/homeInput/action.ts` | `sendAsGroup` 群组创建流程 |
| `src/features/ChatInput/Desktop/MentionedUsers/` | @ mention（群组场景） |
| `src/features/AgentTaskManager/TaskAgentProvider.tsx` | task agent 初始化 |

### 7.5 服务端

| 文件 | 作用 |
|---|---|
| `apps/server/src/services/agent/index.ts` | `getBuiltinAgent(slug)` 服务端实现 |
| `apps/server/src/services/agent/index.test.ts` | 测试 |

---

## 8. 风险与决策点

### 8.1 团长模型选型

团长要做任务拆解和子专家选择，相当于"项目经理"，对推理能力要求高。

| 选项 | 优点 | 缺点 |
|---|---|---|
| DeepSeek-R1 | 推理强、中文好、便宜 | 响应慢（思考链长） |
| Claude Sonnet | 推理强、工具调用稳 | 贵 |
| GPT-4o | 平衡 | 工具调用偶尔不稳 |

**建议**：团长默认配 DeepSeek-R1，可在 `.env` 的 `DEFAULT_AGENT_CONFIG` 里全局配，也可在团长 agent 定义里单独配 model/provider。

### 8.2 子专家模型选型

子专家只做专业范围内的执行，不需要强推理，优先便宜模型。

**建议**：子专家默认配 Qwen 或 DeepSeek-V3，ugs-simulation 这种需要长上下文的可单独配更大窗口模型。

### 8.3 专家团 vs 单专家的选择

不是所有任务都需要专家团。UX 上应让用户能自由选择：

- **简单咨询** → 单专家（如"SY/T 7686 的公式 5 怎么用"→ ugs-capacity）
- **复合任务** → 专家团（如"评估呼图壁库容并给出提高上限建议"→ 库容评估团）

专家市场页通过 Tab 分区让用户自主选，不强制路由。

### 8.4 上游同步风险

| 风险 | 缓解 |
|---|---|
| LobeHub 重构 GroupOrchestration | 我们的改动在"新增文件"层（团长 agent + seed 脚本 + 专家市场页），不碰引擎本体 |
| builtin-agents 包结构变更 | 13 个 ugs-* 目录是纯新增，不冲突 |
| chat_groups schema 变更 | 概率低，若变更有 seed 脚本可快速适配 |

### 8.5 开放问题

- [ ] 专家团对话历史是否独立 topic？需确认 GroupOrchestration 的 topic 隔离机制
- [ ] 子专家能否跨团复用？（设计上可以，一个 agent 可属于多个 chat_group）
- [ ] 专家团的"典型任务示例"从哪来？建议人工撰写 3-5 个 per 团，放团长 systemRole
- [ ] 是否需要"用户自建专家团"功能？（一期不做，预设团队够用）

---

## 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-17 | v1.0 | 初版：架构澄清 + 三层设计 + 落地路线图 |
