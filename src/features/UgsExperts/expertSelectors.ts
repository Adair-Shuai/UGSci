// UGS-MODIFY: UGS-015 专家广场 computed selector
//
// 纯函数 selector 层：从 ExpertMeta（展示层数据）推导卡片/详情所需的 ExpertCardMeta。
// 不触碰任何 store（agentStore / toolStore / mcpStore），不新增后端表结构。
// 遵循项目 selector 风格：纯函数 + 可柯里化，便于在组件中直接调用与 memoize。

import {
  type ExpertCategory,
  type ExpertMeta,
  EXPERT_CATEGORY_ORDER,
  UGS_EXPERTS,
  UGS_EXPERT_TEAMS,
} from './ugsExpertsData';

/**
 * 卡片展示元数据（由 ExpertMeta 计算，卡片组件只消费此结构）
 */
export interface ExpertCardMeta {
  /** 专家广场分类 */
  category: ExpertCategory;
  /** 关联工作流步骤数 */
  workflowCount: number;
  /** 是否规划中占位 */
  planned: boolean;
  /** 关联能力/工具数 */
  toolCount: number;
  /** 能力点数 */
  skillCount: number;
  /** 技能标签（卡片展示用，截断到 3 个） */
  tags: string[];
  /** 职称 */
  title: string;
}

/**
 * 从单个 ExpertMeta 推导 ExpertCardMeta
 */
export const selectExpertCardMeta = (expert: ExpertMeta): ExpertCardMeta => ({
  category: expert.category,
  planned: !!expert.planned,
  skillCount: expert.skills.length,
  tags: expert.tags.slice(0, 3),
  title: expert.title,
  toolCount: expert.recommendedTools.length,
  workflowCount: expert.workflowSteps.length,
});

/**
 * 批量推导卡片元数据
 */
export const selectExpertCardMetaList = (experts: ExpertMeta[]): ExpertCardMeta[] =>
  experts.map(selectExpertCardMeta);

/**
 * 按分类筛选专家（'all' 返回全部）
 */
export const selectExpertsByCategory = (
  experts: ExpertMeta[],
  category: ExpertCategory | 'all',
): ExpertMeta[] => {
  if (category === 'all') return experts;
  return experts.filter((e) => e.category === category);
};

/**
 * 关键词搜索（匹配 name / title / description / tags / skills，大小写不敏感）
 */
export const filterExpertsByKeyword = (experts: ExpertMeta[], keyword: string): ExpertMeta[] => {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return experts;
  return experts.filter((e) => {
    const haystack = [
      e.name,
      e.title,
      e.description,
      ...e.tags,
      ...e.skills,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(kw);
  });
};

/**
 * 各分类专家计数（用于分类 Tabs 标签）
 */
export const selectCategoryCounts = (
  experts: ExpertMeta[],
): Record<ExpertCategory | 'all', number> => {
  const counts = {
    all: experts.length,
    custom: 0,
    development: 0,
    economics: 0,
    geology: 0,
    optimization: 0,
    reservoir: 0,
    simulation: 0,
  } as Record<ExpertCategory | 'all', number>;
  for (const e of experts) counts[e.category]++;
  return counts;
};

/**
 * 统计概览（用于页面顶部统计卡片）
 */
export const selectExpertStats = (experts: ExpertMeta[]) => {
  const meta = selectExpertCardMetaList(experts);
  return {
    categoryCount: EXPERT_CATEGORY_ORDER.length,
    /** 已上线专家数（排除规划中） */
    onlineCount: experts.filter((e) => !e.planned).length,
    plannedCount: experts.filter((e) => e.planned).length,
    skillTotal: meta.reduce((s, m) => s + m.skillCount, 0),
    teamCount: UGS_EXPERT_TEAMS.length,
    toolTotal: meta.reduce((s, m) => s + m.toolCount, 0),
    totalCount: experts.length,
    workflowTotal: meta.reduce((s, m) => s + m.workflowCount, 0),
  };
};

/**
 * 查找包含某专家的所有专家团（Team Relations）
 */
export const selectTeamsByExpertSlug = (slug: string) =>
  UGS_EXPERT_TEAMS.filter((t) => t.memberSlugs.includes(slug));

/** 默认数据源（供页面直接消费） */
export const ALL_EXPERTS = UGS_EXPERTS;
