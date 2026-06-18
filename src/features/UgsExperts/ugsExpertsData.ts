// UGS-MODIFY: UGS-015 储气库专家广场页数据定义
//
// 业务模型：Expert = Persona + Skills + Tools + Workflows + Team Relations
// 本文件为「展示层」元数据，不新增后端表结构。
// ExpertCardMeta 通过 expertSelectors 从 ExpertMeta 推导（skillCount/toolCount/workflowCount）。
import { BUILTIN_AGENTS, BUILTIN_AGENT_SLUGS } from '@lobechat/builtin-agents';

/**
 * 专家分类（专家广场一级筛选用）
 * - geology     地质专家
 * - reservoir   储层专家
 * - development 开发专家
 * - simulation  仿真专家
 * - optimization 优化专家
 * - economics   经济评价专家
 * - custom      自定义
 */
export type ExpertCategory =
  | 'geology'
  | 'reservoir'
  | 'development'
  | 'simulation'
  | 'optimization'
  | 'economics'
  | 'custom';

export interface ExpertCategoryMeta {
  icon: string;
  label: string;
}

export const EXPERT_CATEGORIES: Record<ExpertCategory, ExpertCategoryMeta> = {
  custom: { icon: '🧩', label: '自定义' },
  development: { icon: '🛠️', label: '开发专家' },
  economics: { icon: '💰', label: '经济评价专家' },
  geology: { icon: '⛰️', label: '地质专家' },
  optimization: { icon: '🎯', label: '优化专家' },
  reservoir: { icon: '🪨', label: '储层专家' },
  simulation: { icon: '🖥️', label: '仿真专家' },
};

/** 分类在筛选栏中的展示顺序（全部置于最前，由页面处理） */
export const EXPERT_CATEGORY_ORDER: ExpertCategory[] = [
  'geology',
  'reservoir',
  'development',
  'simulation',
  'optimization',
  'economics',
  'custom',
];

/**
 * 专家展示元数据
 * - slug / avatar / name / description / tags：单一数据源来自 BUILTIN_AGENTS + 展示补充
 * - title：职称（卡片副标题）
 * - category：专家广场分类
 * - skills：能力点（用于 Skills Tab 与 skillCount）
 * - recommendedTools：关联能力标识（用于 Tools Tab 与 toolCount）
 * - workflowSteps：工作流步骤（用于 Workflows Tab 与 workflowCount）
 */
export interface ExpertMeta {
  avatar: string;
  category: ExpertCategory;
  description: string;
  name: string;
  /** 关联能力标识（MCP / Tool Provider identifier） */
  recommendedTools: string[];
  /** 能力点列表 */
  skills: string[];
  slug: string;
  /** 职称 */
  title: string;
  tags: string[];
  /** 工作流步骤（顺序执行） */
  workflowSteps: string[];
  /** 是否为规划中占位（无对应 builtin agent） */
  planned?: boolean;
}

export interface ExpertTeamMeta {
  description: string;
  /** 成员 slug 列表（引用 ugs-* 专家） */
  memberSlugs: string[];
  name: string;
  /** 团长 systemRole（supervisor 人设） */
  supervisorSystemRole: string;
  /** 典型任务示例 */
  tasks: string[];
  /** 团队唯一标识（用于幂等创建） */
  teamId: string;
}

/**
 * 13 个 UGS 专家展示元数据（重构为新分类体系）
 * avatar 从 BUILTIN_AGENTS 读取（单一数据源），其余为展示层定义。
 */
export const UGS_EXPERTS: ExpertMeta[] = [
  // ========== 地质专家 ==========
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsLogging].avatar ?? '📡',
    category: 'geology',
    description: '测井解释、岩性识别、饱和度计算、测井-岩心标定',
    name: '测井解释专家',
    recommendedTools: ['pyrestoolbox-mcp'],
    skills: ['测井曲线解释', '岩性识别', '饱和度计算', '测井-岩心标定'],
    slug: BUILTIN_AGENT_SLUGS.ugsLogging,
    tags: ['测井', '岩性', '饱和度'],
    title: '测井解释工程师',
    workflowSteps: [
      '测井曲线导入与环境校正',
      '岩性识别与分层',
      '孔隙度/饱和度计算',
      '测井-岩心交叉标定',
      '输出解释成果报告',
    ],
  },

  // ========== 储层专家 ==========
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsCapacity].avatar ?? '📊',
    category: 'reservoir',
    description: '储气库库存评价、物质平衡、P/Z 分析、动态储量计算（SY/T 7686-2023）',
    name: '库容评估专家',
    recommendedTools: ['neqsim-mcp-server'],
    skills: ['物质平衡分析', 'P/Z 曲线', '动态储量计算', '库存核算'],
    slug: BUILTIN_AGENT_SLUGS.ugsCapacity,
    tags: ['物质平衡', 'P/Z', '动态储量', 'SY/T 7686'],
    title: '库容评价工程师',
    workflowSteps: [
      '注采气与压力数据整理',
      'P/Z 关系拟合',
      '物质平衡法储量计算',
      '动态储量与库存核算',
      '输出库容评价报告',
    ],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsParams].avatar ?? '⚙️',
    category: 'reservoir',
    description: '储层物性参数解释、孔渗饱计算、相对渗透率曲线、岩石压缩系数',
    name: '储层物性专家',
    recommendedTools: ['pyrestoolbox-mcp'],
    skills: ['孔隙度解释', '渗透率计算', '相对渗透率', '岩石压缩系数'],
    slug: BUILTIN_AGENT_SLUGS.ugsParams,
    tags: ['孔隙度', '渗透率', '相对渗透率'],
    title: '储层物性解释师',
    workflowSteps: [
      '测井/岩心数据归集',
      '孔渗饱参数解释',
      'J 函数标准化标定',
      '相对渗透率曲线构建',
      '输出物性参数报告',
    ],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsPvt].avatar ?? '🔬',
    category: 'reservoir',
    description: 'PVT 相态分析、相图绘制、压缩因子计算、气体黏度（NeqSim）',
    name: 'PVT 相态专家',
    recommendedTools: ['neqsim-mcp-server'],
    skills: ['PVT 相态分析', '相图绘制', 'Z 因子计算', '气体黏度'],
    slug: BUILTIN_AGENT_SLUGS.ugsPvt,
    tags: ['PVT', '相图', 'Z 因子', 'NeqSim'],
    title: 'PVT 相态分析工程师',
    workflowSteps: [
      '流体组分输入与校验',
      '状态方程选择与调参',
      'PVT 物性计算（Z、黏度）',
      '相图绘制与分析',
      '输出 PVT 参数表',
    ],
  },

  // ========== 开发专家 ==========
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsDeliverability].avatar ?? '⚡',
    category: 'development',
    description: '注采能力预测、IPR 曲线分析、二项式产能方程拟合、产能达标率评价',
    name: '产能评估专家',
    recommendedTools: ['pyrestoolbox-mcp'],
    skills: ['IPR 曲线分析', '二项式产能方程', '注采能力预测', '产能达标率'],
    slug: BUILTIN_AGENT_SLUGS.ugsDeliverability,
    tags: ['IPR', '产能方程', '注采能力'],
    title: '产能分析工程师',
    workflowSteps: [
      '试井/生产数据整理',
      'IPR 曲线拟合',
      '二项式产能方程回归',
      '注采能力预测',
      '产能达标率评价',
    ],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsInjection].avatar ?? '🔄',
    category: 'development',
    description: '注采气日报分析、注采平衡、压力监测、运行参数优化',
    name: '注采运行专家',
    recommendedTools: [],
    skills: ['日报分析', '注采平衡核算', '压力监测', '运行参数优化'],
    slug: BUILTIN_AGENT_SLUGS.ugsInjection,
    tags: ['日报分析', '注采平衡', '压力监测'],
    title: '注采运行分析师',
    workflowSteps: [
      '注采气日报导入',
      '注采量核算与平衡分析',
      '压力趋势监测',
      '异常点检测与告警',
      '输出运行优化建议',
    ],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsRateTransient].avatar ?? '📉',
    category: 'development',
    description: '产量递减分析、RTA 流动物质平衡、Agarwal/Fetkovich 拟合',
    name: '产量递减/RTA 专家',
    recommendedTools: ['pyrestoolbox-mcp'],
    skills: ['RTA 分析', '递减曲线识别', '流动物质平衡', 'Agarwal-Gardner 拟合'],
    slug: BUILTIN_AGENT_SLUGS.ugsRateTransient,
    tags: ['RTA', '递减曲线', '流动物质平衡'],
    title: '产量递减分析师',
    workflowSteps: [
      '生产历史数据整理',
      '递减模型识别（Arps/Duong）',
      'RTA 流动物质平衡拟合',
      '动态储量估算',
      '递减预测与置信区间',
    ],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsIntegrity].avatar ?? '🛡️',
    category: 'development',
    description: '井筒完整性评价、套管损伤、固井质量、地应力分析',
    name: '井筒完整性专家',
    recommendedTools: [],
    skills: ['井筒完整性评价', '套管损伤诊断', '固井质量评价', '地应力分析'],
    slug: BUILTIN_AGENT_SLUGS.ugsIntegrity,
    tags: ['井筒', '套管', '固井', '地应力'],
    title: '井筒完整性评价工程师',
    workflowSteps: [
      '测井/检测数据归集',
      '套管状况评估',
      '固井质量评价',
      '地应力与承载分析',
      '完整性分级与风险建议',
    ],
  },

  // ========== 仿真专家 ==========
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsSimulation].avatar ?? '🖥️',
    category: 'simulation',
    description: '数值模拟、地质模型搭建、历史拟合、注采预测（CMG/OPM）',
    name: '数值模拟专家',
    recommendedTools: [],
    skills: ['地质建模', '历史拟合', '注采预测', 'CMG/OPM'],
    slug: BUILTIN_AGENT_SLUGS.ugsSimulation,
    tags: ['数模', '历史拟合', 'CMG', 'OPM'],
    title: '数值模拟工程师',
    workflowSteps: [
      '地质模型搭建与网格化',
      'PVT/相渗/初始化输入',
      '历史拟合与误差量化',
      '注采方案预测',
      '敏感性分析与方案对比',
    ],
  },

  // ========== 优化专家 ==========
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsPeaking].avatar ?? '🏔️',
    category: 'optimization',
    description: '调峰能力评价、应急采气方案、季节调峰策略、峰值产量预测',
    name: '调峰能力专家',
    recommendedTools: [],
    skills: ['调峰能力评价', '应急采气方案', '季节调峰策略', '峰值产量预测'],
    slug: BUILTIN_AGENT_SLUGS.ugsPeaking,
    tags: ['调峰', '应急采气', '峰值预测'],
    title: '调峰优化工程师',
    workflowSteps: [
      '历史负荷与需求分析',
      '峰值需求预测',
      '调峰能力评估',
      '应急采气方案设计',
      '输出调峰优化建议',
    ],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsAllocation].avatar ?? '📐',
    category: 'optimization',
    description: '配产配注方案设计、井间干扰分析、注采分配优化',
    name: '配产配注专家',
    recommendedTools: [],
    skills: ['配产方案设计', '配注方案设计', '井间干扰分析', '注采分配优化'],
    slug: BUILTIN_AGENT_SLUGS.ugsAllocation,
    tags: ['配产', '配注', '井间干扰'],
    title: '配产配注工程师',
    workflowSteps: [
      '需求拆解与目标设定',
      '单井能力评估',
      '井间干扰分析',
      '注采分配优化求解',
      '输出配产配注方案',
    ],
  },
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsBpinn].avatar ?? '🧠',
    category: 'optimization',
    description: 'B-PINN 物理信息神经网络、不确定性量化、概率产能预测',
    name: 'B-PINN 不确定性专家',
    recommendedTools: [],
    skills: ['B-PINN 建模', '不确定性量化', '概率预测', '贝叶斯推断'],
    slug: BUILTIN_AGENT_SLUGS.ugsBpinn,
    tags: ['B-PINN', '不确定性', '概率预测'],
    title: '不确定性量化研究员',
    workflowSteps: [
      '物理方程与控制方程建模',
      '先验分布设定',
      'PINN 网络训练',
      '贝叶斯推断与后验采样',
      '输出概率预测区间',
    ],
  },

  // ========== 经济评价专家（规划中占位） ==========
  {
    avatar: '💰',
    category: 'economics',
    description: '注采方案经济评价、NPV/IRR 测算、注采成本核算、多方案比选',
    name: '经济评价专家',
    planned: true,
    recommendedTools: [],
    skills: ['NPV/IRR 测算', '注采成本核算', '方案经济比选', '敏感性分析'],
    slug: 'ugs-economics',
    tags: ['经济评价', 'NPV', '成本核算'],
    title: '经济评价工程师',
    workflowSteps: [
      '投资与成本参数梳理',
      '注采方案现金流建模',
      'NPV/IRR 测算',
      '多方案经济比选',
      '输出经济评价结论',
    ],
  },

  // ========== 自定义 ==========
  {
    avatar: BUILTIN_AGENTS[BUILTIN_AGENT_SLUGS.ugsLiterature].avatar ?? '📚',
    category: 'custom',
    description: '文献检索、规范查询、综述撰写、行业标准解读',
    name: '文献检索专家',
    recommendedTools: [],
    skills: ['文献检索', '规范查询', '综述撰写', '行业标准解读'],
    slug: BUILTIN_AGENT_SLUGS.ugsLiterature,
    tags: ['文献', '规范', '综述'],
    title: '文献检索助手',
    workflowSteps: [
      '课题分析与检索策略制定',
      '多源文献检索',
      '文献筛选与质量评估',
      '综述撰写与结构整理',
      '引用规范与交付',
    ],
  },
];

/**
 * 5 个预置专家团定义
 * 点击「召唤团队」时，读取 memberSlugs 对应的 BUILTIN_AGENTS 配置，
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
