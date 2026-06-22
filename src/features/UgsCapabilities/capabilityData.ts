// UGS-MODIFY: UGS-016 能力中心 — 分类映射与规划中能力定义
// UGS-MODIFY: UGS-XXX 分类映射重构 — 统一分类源、增强推断、支持 metadata 声明
import type { ConnectorWithTools } from '@/store/tool/slices/connector/types';

import type { CapabilityCategory, PlannedCapability } from './types';

// ─── 可扩展关键词规则 ───────────────────────────────────────
// 在此数组中追加条目即可扩展推断能力，无需修改任何业务代码。

export interface CategoryKeywordRule {
  /** 匹配到的分类 */
  category: CapabilityCategory;
  /** 关键词列表（大小写不敏感），任意一个命中即命中该分类 */
  keywords: string[];
}

export const CATEGORY_KEYWORD_RULES: CategoryKeywordRule[] = [
  // 工程计算
  {
    category: 'engineering-calc',
    keywords: [
      'neqsim',
      'pvt',
      'reservoir',
      'thermodynamic',
      'fluid',
      'compressibility',
      'phase equilibrium',
      'equation of state',
      'eos',
      'engineering',
      'calculation',
      'fluids',
      'property',
    ],
  },
  // 数值模拟
  {
    category: 'numerical-sim',
    keywords: [
      'cmg',
      'eclipse',
      'opm',
      'simulation',
      'simulator',
      'imex',
      'stars',
      'reservoir sim',
      'reservoir simulation',
      'numerical',
      'finite difference',
      'finite element',
      'history match',
    ],
  },
  // 优化决策
  {
    category: 'optimization',
    keywords: [
      'nsga',
      'optimizer',
      'pso',
      'optimization',
      'genetic algorithm',
      'pareto',
      'multi-objective',
      'well placement',
      'production optimization',
      'allocation',
      'schedule',
      '粒子群',
      '遗传算法',
    ],
  },
  // 数据连接
  {
    category: 'data-connection',
    keywords: [
      'file',
      'data',
      'petrel',
      'techlog',
      'database',
      'import',
      'export',
      'connector',
      'connection',
      'api',
      'gateway',
      '数据',
      '文件',
      '连接',
    ],
  },
  // 知识与检索
  {
    category: 'knowledge-retrieval',
    keywords: [
      'search',
      'browser',
      'doc',
      'knowledge',
      'rag',
      'retrieval',
      'web',
      'read',
      'standard',
      '规范',
      '检索',
      '文献',
    ],
  },
];

// ─── 已知 MCP identifier → 分类映射 ────────────────────────
// 精确映射优先级最高。安装新 MCP 后在此追加 identifier → category 即可。
// 也可在 MCP server 的 metadata 中声明 "category" 字段（见 inferCategory 第 2 步）。
export const MCP_CATEGORY_MAP: Record<string, string> = {
  // UGSci 预置 MCP
  'neqsim-mcp-server': 'engineering-calc',
  'pyrestoolbox-mcp': 'engineering-calc',
  // LobeHub 内置工具
  'builtin-search': 'knowledge-retrieval',
  'builtin-browser': 'knowledge-retrieval',
  'builtin-doc-reader': 'data-connection',
};

// ─── 规划中能力 ────────────────────────────────────────────
export const PLANNED_CAPABILITIES: PlannedCapability[] = [
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
  {
    category: 'knowledge-retrieval',
    description: '储气库行业规范库（SY/T 7686 等），RAG 检索',
    icon: '📖',
    name: '规范知识库',
    plannedIdentifier: 'ugs-standards-rag',
    transportType: 'http',
  },
  {
    category: 'system-collab',
    description: 'LangGraph 多智能体编排框架接口',
    icon: '🔗',
    name: 'LangGraph 编排',
    plannedIdentifier: 'langgraph-mcp',
    transportType: 'http',
  },
];

// ─── 辅助函数 ──────────────────────────────────────────────

const VALID_CATEGORIES = new Set<string>([
  'data-connection',
  'engineering-calc',
  'numerical-sim',
  'optimization',
  'knowledge-retrieval',
  'system-collab',
]);

/**
 * 根据 identifier 精确匹配分类
 * 优先查 MCP_CATEGORY_MAP，未命中则返回 undefined（由上层决定 fallback）
 */
export const getCategoryByIdentifier = (identifier: string): CapabilityCategory | undefined => {
  const cat = MCP_CATEGORY_MAP[identifier];
  if (cat && VALID_CATEGORIES.has(cat)) return cat as CapabilityCategory;
  return undefined;
};

/**
 * 根据名称关键词猜测分类（向后兼容的 fallback）
 */
export const guessCategoryByName = (name: string): CapabilityCategory => {
  return matchKeywords(name) ?? 'system-collab';
};

/**
 * 对一段文本做关键词匹配，返回第一个命中的分类
 */
const matchKeywords = (text: string): CapabilityCategory | undefined => {
  const lower = text.toLowerCase();
  for (const rule of CATEGORY_KEYWORD_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return rule.category;
    }
  }
  return undefined;
};

/**
 * 对 connector 做多信号推断，返回最可能的分类：
 *
 * 1. identifier 在 MCP_CATEGORY_MAP 中 → 直接返回
 * 2. connector.metadata 声明了 category 字段 → 返回该值
 * 3. 合并 connector.name + identifier + 各 tool 的 name/description
 *    做关键词匹配 → 返回命中的分类
 * 4. 以上都未命中 → 'system-collab'
 *
 * ③中用到的关键词规则定义在 CATEGORY_KEYWORD_RULES 中，直接在数组中追加
 * 条目即可扩展，无需修改本函数。
 *
 * ②让 MCP server 自身可以声明分类：在 connector.metadata.category 中
 * 填入 CapabilityCategory 即可；能力中心会自动识别。
 */
export const inferCategory = (connector: ConnectorWithTools): CapabilityCategory => {
  // 1. 精确匹配 identifier
  const byId = getCategoryByIdentifier(connector.identifier);
  if (byId) return byId;

  // 2. metadata 声明
  const metaCategory = connector.metadata?.category;
  if (typeof metaCategory === 'string' && VALID_CATEGORIES.has(metaCategory)) {
    return metaCategory as CapabilityCategory;
  }

  // 3. 汇总所有文本特征做关键词匹配
  const allTexts = [
    connector.identifier,
    connector.name,
    ...(connector.tools ?? []).flatMap((t) => [t.toolName, t.displayName, t.description]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const byKeywords = matchKeywords(allTexts);
  if (byKeywords) return byKeywords;

  // 4. 兜底
  return 'system-collab';
};
