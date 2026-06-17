// UGS-MODIFY: UGS-016 储气库能力中心数据定义

export type CapabilityDomain = 'pvt' | 'reservoir' | 'simulation' | 'optimization' | 'geomech';

export interface CapabilitySource {
  /** 能力来源（MCP / API / 算法） */
  name: string;
  status: 'connected' | 'available' | 'planned';
  type: 'mcp' | 'api' | 'algorithm';
}

export interface CapabilityItem {
  /** 原子能力名（底层调用名） */
  functionName: string;
  /** 用户可理解名 */
  label: string;
  /** 参数简述 */
  params?: string;
  /** 返回值简述 */
  returns?: string;
}

export interface CapabilityGroup {
  description: string;
  domain: CapabilityDomain;
  items: CapabilityItem[];
  sources: CapabilitySource[];
  title: string;
}

export const DOMAIN_LABELS: Record<CapabilityDomain, string> = {
  geomech: '岩石力学',
  optimization: '优化求解',
  pvt: 'PVT 相态',
  reservoir: '储层工程',
  simulation: '数值模拟',
};

export const DOMAIN_ICONS: Record<CapabilityDomain, string> = {
  geomech: '⛏️',
  optimization: '🎯',
  pvt: '🔬',
  reservoir: '🛢️',
  simulation: '🖥️',
};

/**
 * 能力中心数据
 * 一期：静态展示已接入的 MCP（NeqSim 80+、pyResToolbox 80+）
 * 二期：动态读取 MCP server 注册的工具列表
 */
export const UGS_CAPABILITIES: CapabilityGroup[] = [
  {
    description: '流体相态计算：相图、压缩因子、露点/泡点、密度、黏度',
    domain: 'pvt',
    items: [
      { functionName: 'runPVT', label: 'PVT 性质计算', params: '组分、温度、压力', returns: '密度、黏度、Z因子' },
      { functionName: 'runFlash', label: '闪蒸计算', params: '组分、T、P', returns: '相态、相分数、组成' },
      { functionName: 'getPhaseEnvelope', label: '相包络线生成', params: '组分', returns: '露点线、泡点线' },
      { functionName: 'gas_z_factor', label: '气体压缩因子', params: 'P、T、比重', returns: 'Z 因子' },
      { functionName: 'gas_viscosity', label: '气体黏度', params: 'P、T、组分', returns: '黏度 (cP)' },
    ],
    sources: [
      { name: 'NeqSim', status: 'connected', type: 'mcp' },
      { name: 'pyResToolbox', status: 'connected', type: 'mcp' },
      { name: 'REFPROP', status: 'planned', type: 'api' },
      { name: 'PVTsim', status: 'planned', type: 'api' },
    ],
    title: 'PVT 相态能力',
  },
  {
    description: '储层工程计算：物质平衡、P/Z、递减曲线、产能方程、节点分析',
    domain: 'reservoir',
    items: [
      { functionName: 'gas_material_balance', label: '气藏物质平衡', params: 'P/Z 历史数据', returns: '动态储量 G' },
      { functionName: 'gas_pz_analysis', label: 'P/Z 分析', params: '压力-产量数据', returns: '压降储量曲线' },
      { functionName: 'fit_decline', label: '递减曲线拟合', params: '产量历史', returns: 'Arps b、qi、Di' },
      { functionName: 'ipr_curve', label: 'IPR 曲线生成', params: '储层参数', returns: '流入动态曲线' },
      { functionName: 'operating_point', label: '节点分析', params: 'IPR + VLP', returns: '工作点 (产量、流压)' },
      { functionName: 'gas_rate_radial', label: '径向流产量计算', params: 'Kh、S、P_r、P_wf', returns: '产量 (m³/d)' },
    ],
    sources: [
      { name: 'pyResToolbox', status: 'connected', type: 'mcp' },
      { name: '自研算法', status: 'available', type: 'algorithm' },
    ],
    title: '储层工程能力',
  },
  {
    description: '数值模拟：地质建模、历史拟合、注采预测、敏感性分析',
    domain: 'simulation',
    items: [
      { functionName: 'validate_simulation_deck', label: '数模模型校验', params: 'ECL/IMEX deck', returns: '校验报告' },
      { functionName: 'build_model', label: '地质建模', params: '网格、属性', returns: '模型文件', },
      { functionName: 'history_match', label: '历史拟合', params: '模型 + 历史数据', returns: '拟合参数' },
      { functionName: 'forecast', label: '注采预测', params: '方案、时间', returns: '产量/压力曲线' },
    ],
    sources: [
      { name: 'CMG', status: 'planned', type: 'api' },
      { name: 'Intersect', status: 'planned', type: 'api' },
      { name: 'OPM Flow', status: 'planned', type: 'api' },
    ],
    title: '数值模拟能力',
  },
  {
    description: '优化求解：井位优化、注采优化、配产配注优化',
    domain: 'optimization',
    items: [
      { functionName: 'well_placement_opt', label: '井位优化', params: '地质模型、约束', returns: '最优井位' },
      { functionName: 'injection_optimization', label: '注采优化', params: '模型、目标函数', returns: '最优注采方案' },
      { functionName: 'production_allocation', label: '配产配注优化', params: '井组、约束', returns: '各井分配' },
    ],
    sources: [
      { name: 'GA（遗传算法）', status: 'available', type: 'algorithm' },
      { name: 'NSGA-II', status: 'available', type: 'algorithm' },
      { name: 'PSO（粒子群）', status: 'available', type: 'algorithm' },
    ],
    title: '优化求解能力',
  },
  {
    description: '岩石力学：地应力、断层稳定性、井壁稳定',
    domain: 'geomech',
    items: [
      { functionName: 'geomech_fault_stability', label: '断层稳定性分析', params: '应力场、断层几何', returns: '安全系数' },
      { functionName: 'geomech_wellbore_stability', label: '井壁稳定分析', params: '地应力、泥浆密度', returns: '坍塌/破裂压力' },
      { functionName: 'geomech_stress_regime', label: '地应力体制判断', params: 'SHmax/Shmin/Sv', returns: '应力体制类型' },
    ],
    sources: [
      { name: 'pyResToolbox (geomech_tools)', status: 'connected', type: 'mcp' },
    ],
    title: '岩石力学能力',
  },
];
