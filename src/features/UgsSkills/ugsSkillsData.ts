// UGS-MODIFY: UGS-017 储气库技能中心数据定义

export type SkillDomain = 'pvt' | 'reservoir' | 'production' | 'geomech' | 'simulation';

export interface SkillItem {
  /** 用户语义名（"帮我画相图"对应这个） */
  description: string;
  /** 依赖的 Capability function */
  functionName: string;
  /** 调用的能力来源 */
  capabilitySource: string;
  /** 技能名 */
  name: string;
  /** 输出格式 */
  output: string;
  /** 输入参数用户语义描述 */
  params: string;
}

export interface SkillGroup {
  description: string;
  domain: SkillDomain;
  items: SkillItem[];
  title: string;
}

export const SKILL_DOMAIN_LABELS: Record<SkillDomain, string> = {
  geomech: '岩石力学技能',
  production: '产能评价技能',
  pvt: 'PVT 分析技能',
  reservoir: '储层工程技能',
  simulation: '数值模拟技能',
};

export const SKILL_DOMAIN_ICONS: Record<SkillDomain, string> = {
  geomech: '⛏️',
  production: '⚡',
  pvt: '🔬',
  reservoir: '🛢️',
  simulation: '🖥️',
};

/**
 * 技能中心数据
 * Skill = 对 Capability 的业务封装（用户可理解的功能）
 * 用户说"帮我画相图"→ 路由到 PVT 技能"相图生成"→ 调用 NeqSim 的 getPhaseEnvelope
 */
export const UGS_SKILLS: SkillGroup[] = [
  {
    description: 'PVT 相态分析技能：相图、压缩因子、黏度计算等用户语义功能',
    domain: 'pvt',
    items: [
      {
        capabilitySource: 'NeqSim',
        description: '生成储层流体的相包络线图（露点线 + 泡点线）',
        functionName: 'getPhaseEnvelope',
        name: '相图生成',
        output: '相包络线图 + 临界点数据',
        params: '流体组分组成',
      },
      {
        capabilitySource: 'NeqSim',
        description: '计算给定组成流体的露点压力',
        functionName: 'runFlash',
        name: '露点计算',
        output: '露点压力 (MPa)',
        params: '组分、温度',
      },
      {
        capabilitySource: 'NeqSim',
        description: '计算天然气的压缩因子（GB/T 17747）',
        functionName: 'gas_z_factor',
        name: 'Z 因子计算',
        output: 'Z 因子值',
        params: '压力、温度、气体比重',
      },
      {
        capabilitySource: 'NeqSim',
        description: '计算天然气在储层条件下的黏度',
        functionName: 'gas_viscosity',
        name: '气体黏度计算',
        output: '黏度 (cP)',
        params: '压力、温度、组分',
      },
    ],
    title: 'PVT 分析技能',
  },
  {
    description: '储层工程技能：物质平衡、P/Z、动态储量等',
    domain: 'reservoir',
    items: [
      {
        capabilitySource: 'pyResToolbox',
        description: '气藏物质平衡分析，计算动态储量',
        functionName: 'gas_material_balance',
        name: '物质平衡分析',
        output: '动态储量 G + 压降曲线',
        params: '地层压力历史、累积产量',
      },
      {
        capabilitySource: 'pyResToolbox',
        description: 'P/Z 曲线绘制与储量计算（SY/T 7686 公式5）',
        functionName: 'gas_pz_analysis',
        name: 'P/Z 分析',
        output: 'P/Z 曲线 + 压降储量',
        params: '压力数据、累积采气量',
      },
      {
        capabilitySource: 'pyResToolbox',
        description: 'Arps 递减曲线拟合（指数/双曲/调和）',
        functionName: 'fit_decline',
        name: '递减曲线分析',
        output: '递减参数 (b, qi, Di) + 预测曲线',
        params: '产量历史数据',
      },
      {
        capabilitySource: 'pyResToolbox',
        description: '基于 Havlena-Odeh 方法的物质平衡诊断',
        functionName: 'havlena_odeh',
        name: 'Havlena-Odeh 诊断',
        output: '水侵类型判断 + 储量',
        params: '压力-产量数据',
      },
    ],
    title: '储层工程技能',
  },
  {
    description: '产能评价技能：IPR、节点分析、产能方程拟合',
    domain: 'production',
    items: [
      {
        capabilitySource: 'pyResToolbox',
        description: '生成气井/油井流入动态曲线（IPR）',
        functionName: 'ipr_curve',
        name: 'IPR 曲线生成',
        output: 'IPR 曲线图 + 方程',
        params: '储层参数（P_r、Kh、S）',
      },
      {
        capabilitySource: 'pyResToolbox',
        description: 'IPR 与 VLP 交点求解工作点',
        functionName: 'operating_point',
        name: '节点分析',
        output: '工作点（产量 + 流压）',
        params: 'IPR 曲线、VLP 曲线',
      },
      {
        capabilitySource: 'pyResToolbox',
        description: '径向流气井产量计算（Darcy / 非Darcy）',
        functionName: 'gas_rate_radial',
        name: '气井产量计算',
        output: '产量 (万方/天)',
        params: '地层系数、表皮因子、压差',
      },
      {
        capabilitySource: 'pyResToolbox',
        description: '二项式/指数式产能方程拟合',
        functionName: 'deliverability_equation',
        name: '产能方程拟合',
        output: '二项式系数 A/B + 指数式 n',
        params: '回压测试数据（产量-流压）',
      },
    ],
    title: '产能评价技能',
  },
  {
    description: '岩石力学技能：断层稳定性、井壁稳定、地应力',
    domain: 'geomech',
    items: [
      {
        capabilitySource: 'pyResToolbox (geomech)',
        description: '断层滑动风险分析',
        functionName: 'geomech_fault_stability',
        name: '断层稳定性分析',
        output: '安全系数 + 风险等级',
        params: '应力场、断层几何、摩擦系数',
      },
      {
        capabilitySource: 'pyResToolbox (geomech)',
        description: '坍塌压力与破裂压力计算',
        functionName: 'geomech_wellbore_stability',
        name: '井壁稳定分析',
        output: '坍塌压力 + 破裂压力窗口',
        params: '地应力、孔隙压力、岩石强度',
      },
    ],
    title: '岩石力学技能',
  },
  {
    description: '数值模拟技能：模型校验、历史拟合、预测',
    domain: 'simulation',
    items: [
      {
        capabilitySource: 'pyResToolbox',
        description: '数模输入文件校验（ECL/IMEX 格式）',
        functionName: 'validate_simulation_deck',
        name: '数模模型校验',
        output: '校验报告（错误 + 警告）',
        params: 'ECLIPSE / IMEX deck 文件',
      },
      {
        capabilitySource: 'CMG（规划中）',
        description: '历史拟合参数敏感性分析',
        functionName: 'history_match_sensitivity',
        name: '历史拟合敏感性',
        output: '参数影响排序 + 最优组合',
        params: '模型文件、历史数据、待拟合参数',
      },
    ],
    title: '数值模拟技能',
  },
];
