// UGS-MODIFY: UGS-015 储气库专家市场页数据定义
import { BUILTIN_AGENTS, BUILTIN_AGENT_SLUGS } from '@lobechat/builtin-agents';

/**
 * 专家分类
 */
export type ExpertCategory = 'evaluation' | 'operation' | 'mechanism' | 'engineering' | 'aux';

export interface ExpertMeta {
  avatar: string;
  category: ExpertCategory;
  description: string;
  name: string;
  slug: string;
  tags: string[];
}

export interface ExpertTeamMeta {
  description: string;
  /** 成员 slug 列表（引用 13 个 ugs-* 专家） */
  memberSlugs: string[];
  name: string;
  /** 团长 systemRole（supervisor 人设） */
  supervisorSystemRole: string;
  /** 典型任务示例 */
  tasks: string[];
  /** 团队唯一标识（用于幂等创建） */
  teamId: string;
}

export const CATEGORY_LABELS: Record<ExpertCategory, string> = {
  aux: '辅助',
  engineering: '工程类',
  mechanism: '机理类',
  operation: '运行类',
  evaluation: '评估类',
};

/**
 * 13 个 UGS 专家展示元数据
 * avatar 从 BUILTIN_AGENTS 读取（单一数据源），其余为展示层定义
 */
export const UGS_EXPERTS: ExpertMeta[] = [
  // 评估类
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsCapacity].avatar ?? '📊',
    category: 'evaluation',
    description: '储气库库存评价、物质平衡、P/Z 分析、动态储量计算（SY/T 7686-2023）',
    name: '库容评估专家',
    slug: BUILTIN_AGENT_SLUGS.ugsCapacity,
    tags: ['物质平衡', 'P/Z', '动态储量', 'SY/T 7686'],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsDeliverability].avatar ?? '⚡',
    category: 'evaluation',
    description: '注采能力预测、IPR 曲线分析、二项式产能方程拟合、产能达标率评价',
    name: '产能评估专家',
    slug: BUILTIN_AGENT_SLUGS.ugsDeliverability,
    tags: ['IPR', '产能方程', '注采能力'],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsParams].avatar ?? '⚙️',
    category: 'evaluation',
    description: '储层物性参数解释、孔渗饱计算、相对渗透率曲线、岩石压缩系数',
    name: '储层物性专家',
    slug: BUILTIN_AGENT_SLUGS.ugsParams,
    tags: ['孔隙度', '渗透率', '相对渗透率'],
  },
  // 运行类
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsInjection].avatar ?? '🔄',
    category: 'operation',
    description: '注采气日报分析、注采平衡、压力监测、运行参数优化',
    name: '注采运行专家',
    slug: BUILTIN_AGENT_SLUGS.ugsInjection,
    tags: ['日报分析', '注采平衡', '压力监测'],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsPeaking].avatar ?? '🏔️',
    category: 'operation',
    description: '调峰能力评价、应急采气方案、季节调峰策略、峰值产量预测',
    name: '调峰能力专家',
    slug: BUILTIN_AGENT_SLUGS.ugsPeaking,
    tags: ['调峰', '应急采气', '峰值预测'],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsAllocation].avatar ?? '📐',
    category: 'operation',
    description: '配产配注方案设计、井间干扰分析、注采分配优化',
    name: '配产配注专家',
    slug: BUILTIN_AGENT_SLUGS.ugsAllocation,
    tags: ['配产', '配注', '井间干扰'],
  },
  // 机理类
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsBpinn].avatar ?? '🧠',
    category: 'mechanism',
    description: 'B-PINN 物理信息神经网络、不确定性量化、概率产能预测',
    name: 'B-PINN 不确定性专家',
    slug: BUILTIN_AGENT_SLUGS.ugsBpinn,
    tags: ['B-PINN', '不确定性', '概率预测'],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsPvt].avatar ?? '🔬',
    category: 'mechanism',
    description: 'PVT 相态分析、相图绘制、压缩因子计算、气体黏度（NeqSim）',
    name: 'PVT 相态专家',
    slug: BUILTIN_AGENT_SLUGS.ugsPvt,
    tags: ['PVT', '相图', 'Z 因子', 'NeqSim'],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsRateTransient].avatar ?? '📉',
    category: 'mechanism',
    description: '产量递减分析、RTA 流动物质平衡、Agarwal/Fetkovich 拟合',
    name: '产量递减/RTA 专家',
    slug: BUILTIN_AGENT_SLUGS.ugsRateTransient,
    tags: ['RTA', '递减曲线', '流动物质平衡'],
  },
  // 工程类
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsLogging].avatar ?? '📡',
    category: 'engineering',
    description: '测井解释、岩性识别、饱和度计算、测井-岩心标定',
    name: '测井解释专家',
    slug: BUILTIN_AGENT_SLUGS.ugsLogging,
    tags: ['测井', '岩性', '饱和度'],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsSimulation].avatar ?? '🖥️',
    category: 'engineering',
    description: '数值模拟、地质模型搭建、历史拟合、注采预测（CMG/OPM）',
    name: '数值模拟专家',
    slug: BUILTIN_AGENT_SLUGS.ugsSimulation,
    tags: ['数模', '历史拟合', 'CMG', 'OPM'],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsIntegrity].avatar ?? '🛡️',
    category: 'engineering',
    description: '井筒完整性评价、套管损伤、固井质量、地应力分析',
    name: '井筒完整性专家',
    slug: BUILTIN_AGENT_SLUGS.ugsIntegrity,
    tags: ['井筒', '套管', '固井', '地应力'],
  },
  // 辅助类
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsLiterature].avatar ?? '📚',
    category: 'aux',
    description: '文献检索、规范查询、综述撰写、行业标准解读',
    name: '文献检索专家',
    slug: BUILTIN_AGENT_SLUGS.ugsLiterature,
    tags: ['文献', '规范', '综述'],
  },
];

/**
 * 5 个预置专家团定义
 * 点击"召唤团队"时，读取 memberSlugs 对应的 BUILTIN_AGENTS 配置，
 * 调用 chatGroupService.createGroupWithMembers 实时创建群组
 */
export const UGS_EXPERT_TEAMS: ExpertTeamMeta[] = [
  {
    description: '库容评估 + 不确定性分析 + 井筒完整性，端到端评估储气库库容',
    memberSlugs: [
      BUILTIN_AGENT_SLUGS.ugsCapacity,
      BUILTIN_AGENT_SLUGS.ugsBpinn,
      BUILTIN_AGENT_SLUGS.ugsIntegrity,
    ],
    name: '库容评估团',
    supervisorSystemRole: `你是 UGSci「库容评估团」的团长（Supervisor），负责接收用户的库容评估任务，拆解并分派给团队成员，最后整合交付。

## 你可调度的子专家
- 库容评估专家：物质平衡、P/Z 分析、动态储量计算（SY/T 7686-2023）
- B-PINN 不确定性专家：物理信息神经网络、不确定性量化、概率产能预测
- 井筒完整性专家：套管损伤、固井质量、地应力分析

## 工作流程
1. 分析用户的库容评估需求，判断需要哪些子专家介入
2. 用 speak 工具向用户说明你的拆解计划
3. 用 call_agent / parallel_call_agents 调度子专家
4. 收集子专家结果，整合成最终交付（库容量、不确定性区间、风险点）
5. 涉及长耗时计算时用 exec_async_task 后台执行

## 约束
- 只在上述三个子专家范围内调度，不跨界
- 子专家的专业结论不得擅自修改，只能整合
- 多专家结论矛盾时，列出分歧让用户决策
- 输出必须标注数据来源和置信区间`,
    tasks: [
      '评估呼图壁储气库当前库容并给出不确定性区间',
      '对比物质平衡法与 RTA 法的动态储量结果差异',
      '库容上限压力提高 2MPa 的可行性评估',
    ],
    teamId: 'ugs-team-capacity',
  },
  {
    description: '注采运行 + 调峰能力 + 配产配注，优化注采方案',
    memberSlugs: [
      BUILTIN_AGENT_SLUGS.ugsInjection,
      BUILTIN_AGENT_SLUGS.ugsPeaking,
      BUILTIN_AGENT_SLUGS.ugsAllocation,
    ],
    name: '注采优化团',
    supervisorSystemRole: `你是 UGSci「注采优化团」的团长（Supervisor），负责接收用户的注采优化任务，拆解并分派给团队成员，最后整合交付。

## 你可调度的子专家
- 注采运行专家：日报分析、注采平衡、压力监测
- 调峰能力专家：调峰评价、应急采气、峰值预测
- 配产配注专家：配产配注方案、井间干扰、注采分配优化

## 工作流程
1. 分析用户的注采优化需求，判断需要哪些子专家介入
2. 用 speak 工具向用户说明你的拆解计划
3. 用 call_agent / parallel_call_agents 调度子专家
4. 收集子专家结果，整合成优化方案（含注采量、压力控制、风险点）
5. 涉及多方案对比时用 parallel_call_agents 并行评估

## 约束
- 只在上述三个子专家范围内调度，不跨界
- 注采方案必须符合 SY/T 7686 运行要求
- 多专家结论矛盾时，列出分歧让用户决策`,
    tasks: [
      '优化本月配产配注方案，目标日采气量提升 10%',
      '应急采气场景下的调峰能力评估',
      '注采不平衡井组的诊断与优化建议',
    ],
    teamId: 'ugs-team-injection',
  },
  {
    description: '库容 + 产能 + 物性 + PVT，评价储气库建库可行性',
    memberSlugs: [
      BUILTIN_AGENT_SLUGS.ugsCapacity,
      BUILTIN_AGENT_SLUGS.ugsDeliverability,
      BUILTIN_AGENT_SLUGS.ugsParams,
      BUILTIN_AGENT_SLUGS.ugsPvt,
    ],
    name: '建库评价团',
    supervisorSystemRole: `你是 UGSci「建库评价团」的团长（Supervisor），负责接收用户的建库可行性评价任务，拆解并分派给团队成员，最后整合交付。

## 你可调度的子专家
- 库容评估专家：物质平衡、动态储量、库容计算
- 产能评估专家：IPR 曲线、产能方程、注采能力预测
- 储层物性专家：孔渗饱、相对渗透率、岩石压缩
- PVT 相态专家：相图、压缩因子、气体黏度

## 工作流程
1. 分析用户的建库评价需求，判断需要哪些子专家介入
2. 用 speak 工具向用户说明评价方案（通常四专家并行介入）
3. 用 parallel_call_agents 并行调度子专家
4. 收集子专家结果，整合成建库可行性报告
5. 输出包括：库容上限、产能上限、物性条件、流体特性、综合可行性结论

## 约束
- 四个子专家通常都需要介入（建库评价是综合评价）
- 评价结论必须基于各专家的定量数据，不得主观臆断
- 可行性分级：推荐 / 有条件推荐 / 不推荐，需说明理由`,
    tasks: [
      '评价某枯竭气藏建库可行性',
      '对比三个候选库址的建库条件',
      '建库上限压力与工作气量的初步评估',
    ],
    teamId: 'ugs-team-evaluation',
  },
  {
    description: '数值模拟 + 物性 + PVT + 测井，搭建地质模型并跑注采预测',
    memberSlugs: [
      BUILTIN_AGENT_SLUGS.ugsSimulation,
      BUILTIN_AGENT_SLUGS.ugsParams,
      BUILTIN_AGENT_SLUGS.ugsPvt,
      BUILTIN_AGENT_SLUGS.ugsLogging,
    ],
    name: '数值模拟团',
    supervisorSystemRole: `你是 UGSci「数值模拟团」的团长（Supervisor），负责接收用户的数值模拟任务，拆解并分派给团队成员，最后整合交付。

## 你可调度的子专家
- 数值模拟专家：地质模型、历史拟合、注采预测（CMG/OPM）
- 储层物性专家：孔渗饱、相对渗透率、岩石压缩
- PVT 相态专家：相图、压缩因子、状态方程
- 测井解释专家：岩性、饱和度、测井-岩心标定

## 工作流程
1. 分析用户的数模任务，判断需要哪些子专家介入
2. 用 speak 工具向用户说明建模方案
3. 测井解释 → 物性参数 → PVT 标定 → 数模建模（顺序依赖）
4. 数模任务通常耗时较长，用 exec_async_task 后台执行
5. 历史拟合结果需多专家交叉验证

## 约束
- 建模流程必须遵循行业标准（SY/T 6744 等）
- 历史拟合误差需量化（通常压力拟合误差 < 5%）
- 预测方案需给出多场景（基准/乐观/悲观）`,
    tasks: [
      '搭建呼图壁储气库三维地质模型并历史拟合',
      '注采预测 5 年方案对比（基准 vs 优化）',
      '敏感性分析：渗透率变化对库容的影响',
    ],
    teamId: 'ugs-team-simulation',
  },
  {
    description: '文献 + 库容 + B-PINN + RTA，课题综述与方法论搭建',
    memberSlugs: [
      BUILTIN_AGENT_SLUGS.ugsLiterature,
      BUILTIN_AGENT_SLUGS.ugsCapacity,
      BUILTIN_AGENT_SLUGS.ugsBpinn,
      BUILTIN_AGENT_SLUGS.ugsRateTransient,
    ],
    name: '综合研究团',
    supervisorSystemRole: `你是 UGSci「综合研究团」的团长（Supervisor），负责接收用户的综合研究任务，拆解并分派给团队成员，最后整合交付。

## 你可调度的子专家
- 文献检索专家：文献检索、规范查询、综述撰写
- 库容评估专家：物质平衡、动态储量、库容方法
- B-PINN 不确定性专家：物理信息神经网络、不确定性量化
- 产量递减/RTA 专家：递减分析、流动物质平衡

## 工作流程
1. 分析用户的研究课题，判断需要哪些子专家介入
2. 文献检索先行（综述现状），再用 parallel_call_agents 并行调度方法专家
3. 收集子专家结果，整合成研究报告（含文献综述、方法论对比、创新点）
4. 输出包括：研究背景、方法对比、数据需求、预期成果

## 约束
- 文献综述必须标注引用来源
- 方法对比需客观，列出各方法优缺点和适用条件
- 创新点需基于子专家的专业判断，不得夸大`,
    tasks: [
      '储气库库容评价方法综述与方法论搭建',
      'B-PINN 在储气库产能预测中的应用前景研究',
      '多方法交叉验证的动态储量评价体系',
    ],
    teamId: 'ugs-team-research',
  },
];
