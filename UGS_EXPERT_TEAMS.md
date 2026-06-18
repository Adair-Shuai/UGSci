# UGSci 架构设计（Architecture V2）

> 本文档是 UGSci 储气库领域 AI 工作台的**目标架构**，由多轮讨论（与 ChatGPT、WorkBuddy 对比、用户决策）凝练而成。
>
> **配套文档**：`ARCHITECTURE.md`（LobeHub 系统架构）、`UPSTREAM_SYNC.md`（上游同步策略）
>
> **核心定位**：UGSci 不是「LobeHub 改皮肤版」，而是**储气库领域 AI Operating System**——对标 WorkBuddy / Harvey / Palantir AIP，但聚焦储气库垂直领域。
>
> **关键判断**：LobeHub 原生 `GroupOrchestration` ≡ WorkBuddy 专家团（同构 Manager Pattern），**不自研编排引擎**；LobeHub 强绑定的只有 Expert（Agent）和 Team（Group）两层，其他四层是 UGSci 差异化竞争力。

---

## 目录

1. [五层 + 横向架构总览](#1-五层--横向架构总览)
2. [各层定义与一期/二期划分](#2-各层定义与一期二期划分)
3. [侧边栏顶级入口设计](#3-侧边栏顶级入口设计)
4. [核心机制复用：LobeHub 原生 vs UGSci 新建](#4-核心机制复用lobehub-原生-vs-ugsci-新建)
5. [专家团设计](#5-专家团设计)
6. [一期实施清单](#6-一期实施清单)
7. [二期/三期路线](#7-二期三期路线)
8. [关键代码索引](#8-关键代码索引)
9. [决策记录](#9-决策记录)

---

## 1. 五层 + 横向架构总览

```
                    Knowledge Hub（横向贯穿）
                          ↑
    Workflow → Team → Expert → Skill → Capability
    （二期）  （一期）  （一期）  （一期）  （一期）
```

| 层 | 定义 | LobeHub 强绑定？ | 一期 |
|---|---|---|---|
| **Capability** | 原子能力（MCP/API/算法），无人格无业务语义 | ❌ 差异化 | ✅ 侧边栏入口 |
| **Skill** | 对 Capability 的业务封装（"帮我画相图"→getPhaseEnvelope） | ❌ 差异化 | ✅ 侧边栏入口 |
| **Expert** | Knowledge + Prompt + Reasoning + Skills = Lobe 原生助理 | ✅ = Agent | ✅ 13 ugs + 用户自建 |
| **Team** | Supervisor + Experts 协作 = Lobe GroupOrchestration | ✅ = Group | ✅ 5 预置团 |
| **Workflow** | 行业 SOP 数字化（库容评价 7 步流程等） | ❌ 差异化 | ⏳ 二期 |
| **Knowledge Hub** | 规范库+案例库+方法论库（RAG+Graph） | ❌ 差异化 | ⏳ 二期 v1 |

### 调用链路

```
用户：「帮我算库容」
  ↓
Workflow（库容评价 7 步流程，二期）
  ↓
Team（库容评估团，一期）
  ↓
Expert（库容评估专家，一期）
  ↓
Skill（物质平衡分析，一期）
  ↓
Capability（pyResToolbox.gas_material_balance，一期）
```

---

## 2. 各层定义与一期/二期划分

### 2.1 Capability（能力中心）— 一期

**定义**：平台底层原子能力。本身无人格、无业务语义、无推理能力，仅负责执行。

**本质**：Capability = MCP + API + 算法 + 软件接口，是平台真正的技术资产。

**一期落地**：侧边栏顶级入口，**直接移植 LobeHub 现成 MCP 管理页面**（`src/features/MCP/MCPSettings`），不重写。

**域划分**（5 域）：
- PVT 相态（NeqSim 已连接，REFPROP/PVTsim 规划中）
- 储层工程（pyResToolbox 已连接）
- 数值模拟（CMG/Intersect/OPM 规划中）
- 优化求解（GA/NSGA-II/PSO 可用）
- 岩石力学（pyResToolbox geomech_tools 已连接）

### 2.2 Skill（技能中心）— 一期

**定义**：对 Capability 的业务封装。面向用户、可理解、可复用。

**用户语义**：用户说「帮我画相图」→ 路由到 PVT 技能「相图生成」→ 调用 NeqSim 的 getPhaseEnvelope

**一期落地**：侧边栏顶级入口，**直接移植 LobeHub 现成技能管理页面**（`src/features/SkillStore` 或 `src/features/AgentSkillEdit`），不重写。

**Skill ≠ Capability**：
- `getPhaseEnvelope()` 是 Capability（原子调用）
- "帮我画相图" 是 Skill（用户语义的功能）
- 同一个 Capability 可被多个 Skill 封装（如 NeqSim 的 flash 既支持"露点计算"也支持"泡点计算"）

### 2.3 Expert（专家）— 一期

**定义**：Skill + Knowledge + Prompt + Reasoning。专家不是工具，专家是**使用技能**的角色。

**本质**：Expert = LobeHub 原生助理（Agent）。13 个 ugs-* 是 builtin agent，用户自建专家走 Lobe 原生 `/agent/profile`。

**一期落地**：侧边栏顶级入口，**专家市场页展示 13 个 ugs builtin 专家 + 用户自建助理**（Lobe 原生助手列表）。点击单专家 → 进入专属对话。

**13 个 ugs 专家**（已实现于 `packages/builtin-agents/src/agents/ugs-*/`）：
- 评估类(3)：ugs-capacity / ugs-deliverability / ugs-params
- 运行类(3)：ugs-injection / ugs-peaking / ugs-allocation
- 机理类(3)：ugs-bpinn / ugs-pvt / ugs-rate-transient
- 工程类(3)：ugs-logging / ugs-simulation / ugs-integrity
- 辅助类(1)：ugs-literature

### 2.4 Team（专家团）— 一期

**定义**：多个专家协作的组织。有组织关系（团长 + 子专家）、有协作关系（团长拆解 → 子专家执行 → 团长整合）。

**本质**：Team = LobeHub GroupOrchestration（Supervisor-Executor 双层状态机）。团长是 `createGroupWithMembers` 时自动生成的 virtual agent，**不需单独建团长 agent**。

**关键语义**（WorkBuddy 专家团同构）：
- 团队结构预设：哪个专家进团、谁是团长，产品设计时确定
- 用户只与团长对话：用户描述任务 → 团长接收 → 团长拆解并分派 → 子专家执行 → 团长整合
- 子专家过程可见：用户能看到子专家发言和工作进度
- 调度范围封闭：团长只在预设成员范围内调度

**一期落地**：5 个预置专家团（库容评估团/注采优化团/建库评价团/数值模拟团/综合研究团），接口预留用户自建团（二期）。

**六种 Executor**（LobeHub 原生，不自研）：
- call_supervisor（团长决策）
- call_agent（调单子专家）
- parallel_call_agents（并行广播）
- delegate（委派）
- exec_async_task（后台异步长任务）
- batch_exec_async_tasks（批量并行异步）

### 2.5 Workflow（工作流）— 二期

**定义**：行业 SOP 数字化。用户真正关心的最高层。

**示例**：库容评价 Workflow = 导入数据 → 数据质检 → 压力恢复 → P/Z 分析 → 动态储量 → 库容计算 → 不确定性分析 → 报告生成

**与 Team 的关系**：Workflow 调用 Team，Team 调用 Expert，Expert 调用 Skill，Skill 调用 Capability。

**边界**（用户决策）：Workflow 不是拖拽画布式编排（那个对储气库用户没意义），是业务逻辑编排。具体模式二期再定义。

### 2.6 Knowledge Hub（知识中心）— 二期 v1

**定义**：所有专家共享的知识底座。横向贯穿五层。

**内容**：
- 储气库规范库（SY/T 7686-2023、SY/T 6856、API RP 等）
- 项目案例库（呼图壁、大港、金坛、文23 等）
- 方法论库（库容评价方法、动态储量方法、BPINN 方法、历史拟合方法）
- 企业知识库（用户私有）

**落地**：RAG + Knowledge Graph。一期暂不做（规范已嵌入 ugs-capacity 的 systemRole），二期 v1 抽离到共享知识层。

---

## 3. 侧边栏顶级入口设计

按用户决策，UGSci 左侧菜单应是 7 个并列顶级入口：

```
📚 知识中心          /ugs-knowledge       （二期）
🔧 能力中心          /ugs-capabilities    （一期，移植 MCP 管理）
🧩 技能中心          /ugs-skills          （一期，移植 SkillStore）
👨‍🔬 专家市场          /ugs-experts         （一期，13 ugs + 用户自建助理）
👥 专家团            /ugs-teams           （一期，5 预置团 + 二期自建）
⚙️ 工作流            /ugs-workflows       （二期）
📁 项目空间          /ugs-projects        （三期）
```

**与 LobeHub 原生强绑定的只有 Expert（Agent）和 Team（Group）**，其他层是 UGSci 差异化竞争力。

**移植策略**（用户决策："专家、技能、mcp 这些都是现成的可以直接内部移植"）：

| 入口 | 现成组件 | 移植方式 |
|---|---|---|
| 能力中心 | `src/features/MCP/MCPSettings` | 直接挂到 /ugs-capabilities 路由 |
| 技能中心 | `src/features/SkillStore` 或 `src/features/AgentSkillEdit` | 直接挂到 /ugs-skills 路由 |
| 专家市场 | 13 ugs builtin + Lobe 原生助手列表 | ugsExpertsData + Lobe 助手列表组件 |
| 专家团 | Lobe 原生 GroupOrchestration + TeamCard | createGroupWithMembers + GroupOrchestration 引擎 |

---

## 4. 核心机制复用：LobeHub 原生 vs UGSci 新建

| 机制 | LobeHub 原生 | UGSci 新建 |
|---|---|---|
| Agent 创建/管理 | ✅ /agent/profile, AgentBuilder | ❌ 不重写 |
| Group 创建/管理 | ✅ /group, createGroupWithMembers | ❌ 不重写 |
| GroupOrchestration 引擎 | ✅ 6 种 Executor | ❌ 不自研 |
| MCP 管理 | ✅ src/features/MCP/MCPSettings | ❌ 移植 |
| Skill 管理 | ✅ src/features/SkillStore | ❌ 移植 |
| 13 ugs 专家定义 | ❌ | ✅ packages/builtin-agents/ugs-* |
| 5 预置专家团定义 | ❌ | ✅ ugsExpertsData.ts 的 UGS_EXPERT_TEAMS |
| 专家市场页 UI | ❌ | ✅ src/features/UgsExperts |
| Workflow 编排器 | ❌ | ⏳ 二期 |
| Knowledge Hub | ❌ | ⏳ 二期 |

**核心原则**：能用 LobeHub 原生的就用原生，不重写。UGSci 只新建 LobeHub 没有的层（ugs 专家定义、预置团定义、Workflow、Knowledge Hub）。

---

## 5. 专家团设计

### 5.1 团长 systemRole 规范

团长的 systemRole 必须包含：
1. 角色定义（你是 X 团团长）
2. 可调度子专家列表（slug + 能力简述）
3. 工作流程（分析→speak→call_agent→整合→交付）
4. 约束（不跨界、不改子专家结论、矛盾时列分歧让用户决策）

### 5.2 5 个预置专家团

| 团队 | 团长 slug | 子专家 | 典型任务 |
|---|---|---|---|
| 库容评估团 | supervisor（virtual） | ugs-capacity + ugs-bpinn + ugs-integrity | 评估呼图壁库容 + 不确定性区间 |
| 注采优化团 | supervisor（virtual） | ugs-injection + ugs-peaking + ugs-allocation | 优化本月配产配注方案 |
| 建库评价团 | supervisor（virtual） | ugs-capacity + ugs-deliverability + ugs-params + ugs-pvt | 评价某枯竭气藏建库可行性 |
| 数值模拟团 | supervisor（virtual） | ugs-simulation + ugs-params + ugs-pvt + ugs-logging | 搭建地质模型并历史拟合 |
| 综合研究团 | supervisor（virtual） | ugs-literature + ugs-capacity + ugs-bpinn + ugs-rate-transient | 课题综述 + 方法论搭建 |

### 5.3 创建流程

点击"召唤团队" → `chatGroupService.createGroupWithMembers`（groupConfig + members + supervisorConfig）→ 服务端自动创建 supervisor virtual agent + member virtual agents → 返回 groupId → `navigate('/group/{groupId}')` → GroupOrchestration 引擎接管。

**注意**：members 是 virtual agent 副本（从 BUILTIN_AGENTS 读 systemRole 复制），不是引用 builtin agent。同一专家在不同团有多个副本——这是 LobeHub 群组机制的特性，不是 bug。

---

## 6. 一期实施清单

### 6.1 侧边栏入口（4 个，一期）

| 入口 | 路由 | 实现方式 | 状态 |
|---|---|---|---|
| 能力中心 | /ugs-capabilities | 移植 MCP/MCPSettings | ⏳ 待移植 |
| 技能中心 | /ugs-skills | 移植 SkillStore | ⏳ 待移植 |
| 专家市场 | /ugs-experts | UgsExperts（13 ugs + 用户自建） | ⏳ 待修复路由 |
| 专家团 | /ugs-teams | TeamCard 列表 + createGroupWithMembers | ⏳ 待建 |

### 6.2 13 个 ugs 专家（已完成）

- `packages/builtin-agents/src/agents/ugs-*/` — 13 个专家定义
- `ugs-capacity` 已嵌入 SY/T 7686-2023 规范
- MCP 工具映射已写入各专家 systemRole

### 6.3 5 个预置专家团（数据已定义）

- `src/features/UgsExperts/ugsExpertsData.ts` 的 `UGS_EXPERT_TEAMS` — 5 团定义（含团长 systemRole）

### 6.4 路由与菜单（已建，待修复）

- `desktopRouter.config.tsx` + `.desktop.tsx` 双写注册
- `DEFAULT_SIDEBAR_ITEMS` + `SidebarTabKey` + `useNavLayout` 三处同步
- i18n（en + zh-CN）

---

## 7. 二期/三期路线

### 二期
- **Workflow 层**：定义业务逻辑编排模式（用户思考后启动），不是拖拽画布
- **用户自建专家团**：表单式 UI（选团长 + 勾选成员 + 写团队目标），不是画布编排
- **Knowledge Hub v1**：规范库独立（SY/T 7686 从 ugs-capacity 抽离到共享知识层）

### 三期
- Knowledge Graph + 企业知识库
- 完整 Skill 注册中心（Capability ↔ Skill 显式分层，动态读取 MCP 工具列表）
- 项目空间（📁 /ugs-projects）

---

## 8. 关键代码索引

### 8.1 UGSci 新建

| 文件 | 作用 |
|---|---|
| `packages/builtin-agents/src/agents/ugs-*/` | 13 个 ugs 专家定义 |
| `src/features/UgsExperts/ugsExpertsData.ts` | 13 专家元数据 + 5 团定义 |
| `src/features/UgsExperts/index.tsx` | 专家市场页主页面 |
| `src/features/UgsShared/PageHeader.tsx` | 共用页头组件 |
| `src/store/global/selectors/systemStatus.ts` | DEFAULT_SIDEBAR_ITEMS（侧边栏 key 列表） |

### 8.2 LobeHub 原生（移植用）

| 文件 | 作用 |
|---|---|
| `src/features/MCP/MCPSettings/` | MCP 管理（移植到能力中心） |
| `src/features/SkillStore/` | 技能商店（移植到技能中心） |
| `src/features/AgentSkillEdit/` | 技能编辑 |
| `src/services/chatGroup/index.ts` | `createGroupWithMembers` 服务 |
| `src/store/chat/agents/GroupOrchestration/createGroupOrchestrationExecutors.ts` | 6 种 Executor（1117 行，不自研） |
| `packages/database/src/schemas/chatGroup.ts` | `chat_groups` + `chat_groups_agents` schema |

### 8.3 路由与导航

| 文件 | 作用 |
|---|---|
| `src/spa/router/desktopRouter.config.tsx` + `.desktop.tsx` | 桌面路由双写 |
| `packages/app-config/src/routes/index.ts` | NAVIGATION_ROUTES 配置 |
| `src/hooks/useNavLayout.ts` | 侧边栏菜单项 hook |
| `src/store/global/initialState.ts` | SidebarTabKey 枚举 |

---

## 9. 决策记录

| 日期 | 决策 | 理由 |
|---|---|---|
| 2026-06-17 | 不自研编排引擎，复用 GroupOrchestration | 与 WorkBuddy 专家团同构，LobeHub 一升级自研就废 |
| 2026-06-17 | 专家 = Lobe 原生助理，用户自建走 /agent/profile | 零开发量，LobeHub 原生支持 |
| 2026-06-17 | Capability/Skill 一期做 | NeqSim/pyResToolbox 现成，改造放侧边栏 |
| 2026-06-17 | Workflow 二期做，不是拖拽画布 | 业务逻辑编排，具体模式再思考 |
| 2026-06-17 | 预置团一期做，自建团二期做，接口预留 | 团长 systemRole 质量需打磨，自建团 UI 用表单不用画布 |
| 2026-06-17 | 升级 3 层为 5 层 + 横向 Knowledge Hub | 对标 WorkBuddy/Harvey/Palantir AIP，做储气库 AI OS |
| 2026-06-18 | 能力/技能/MCP 页面用 LobeHub 现成组件移植 | 不重写，直接挂到侧边栏入口 |

---

## 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-06-17 | v1.0 | 初版：3 层架构（Skill→Expert→Team） |
| 2026-06-18 | v2.0 | 升级为 5 层 + 横向 Knowledge Hub；明确一期/二期划分；明确移植策略 |
