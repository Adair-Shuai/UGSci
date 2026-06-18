// UGS-MODIFY: UGS-016 能力中心 — 分类映射与规划中能力定义
import type { PlannedCapability } from './types';

/**
 * 已知 MCP identifier → 分类映射
 * 安装的 MCP server 通过此映射确定所属分类
 */
export const MCP_CATEGORY_MAP: Record<string, string> = {
  // 已接入（UGSci 预置 MCP）
  'neqsim-mcp-server': 'engineering-calc',
  'pyrestoolbox-mcp': 'engineering-calc',
  // LobeHub 内置工具
  'builtin-search': 'knowledge-retrieval',
  'builtin-browser': 'knowledge-retrieval',
  'builtin-doc-reader': 'data-connection',
};

/**
 * 规划中（尚未安装）的能力
 * 这些能力在能力中心以"规划中"状态展示，点击可查看规划信息
 */
export const PLANNED_CAPABILITIES: PlannedCapability[] = [
  // 数值模拟
  {
    category: 'numerical-sim',
    description: 'CMG IMEX/STARS 数值模拟器，支持地质建模、历史拟合、注采预测',
    icon: '🏭',
    name: 'CMG 数值模拟',
    plannedIdentifier: 'cmg-mcp',
    transportType: 'api',
  },
  {
    category: 'numerical-sim',
    description: 'Schlumberger Eclipse 数值模拟器，黑油/组分模拟',
    icon: '🏔️',
    name: 'Eclipse 数值模拟',
    plannedIdentifier: 'eclipse-mcp',
    transportType: 'api',
  },
  {
    category: 'numerical-sim',
    description: 'OPM Flow 开源数值模拟器，Eclipse 兼容',
    icon: '🌍',
    name: 'OPM Flow',
    plannedIdentifier: 'opm-mcp',
    transportType: 'stdio',
  },
  // 优化决策
  {
    category: 'optimization',
    description: 'NSGA-II 多目标优化算法，支持注采优化、配产配注',
    icon: '🎯',
    name: 'NSGA-II 优化器',
    plannedIdentifier: 'nsga2-mcp',
    transportType: 'algorithm',
  },
  {
    category: 'optimization',
    description: '遗传算法全局优化，井位优化、参数寻优',
    icon: '🧬',
    name: 'GA 优化器',
    plannedIdentifier: 'ga-mcp',
    transportType: 'algorithm',
  },
  // 数据连接
  {
    category: 'data-connection',
    description: 'Petrel 地质建模软件数据接口，网格、属性、井轨迹读取',
    icon: '📐',
    name: 'Petrel 数据接口',
    plannedIdentifier: 'petrel-mcp',
    transportType: 'api',
  },
  {
    category: 'data-connection',
    description: 'Techlog 测井解释软件数据接口，曲线、解释成果读取',
    icon: '📡',
    name: 'Techlog 数据接口',
    plannedIdentifier: 'techlog-mcp',
    transportType: 'api',
  },
  // 知识与检索
  {
    category: 'knowledge-retrieval',
    description: '储气库行业规范库（SY/T 7686 等），RAG 检索',
    icon: '📖',
    name: '规范知识库',
    plannedIdentifier: 'ugs-standards-rag',
    transportType: 'http',
  },
  // 系统协同
  {
    category: 'system-collab',
    description: 'LangGraph 多智能体编排框架接口',
    icon: '🔗',
    name: 'LangGraph 编排',
    plannedIdentifier: 'langgraph-mcp',
    transportType: 'http',
  },
];

/**
 * 根据插件 identifier 获取分类
 * 优先查 MCP_CATEGORY_MAP，未命中则默认归"系统协同"
 */
export const getCategoryByIdentifier = (identifier: string): string => {
  return MCP_CATEGORY_MAP[identifier] ?? 'system-collab';
};

/**
 * 根据插件名称关键词猜测分类（fallback）
 */
export const guessCategoryByName = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('neqsim') || lower.includes('pvt') || lower.includes('reservoir')) {
    return 'engineering-calc';
  }
  if (lower.includes('cmg') || lower.includes('eclipse') || lower.includes('opm') || lower.includes('sim')) {
    return 'numerical-sim';
  }
  if (lower.includes('search') || lower.includes('browser') || lower.includes('doc')) {
    return 'knowledge-retrieval';
  }
  if (lower.includes('file') || lower.includes('data') || lower.includes('petrel')) {
    return 'data-connection';
  }
  return 'system-collab';
};
