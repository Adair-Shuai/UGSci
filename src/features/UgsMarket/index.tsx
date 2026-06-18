// UGS-MODIFY: UGS 市场弹窗（统一三页：能力/技能/专家）
//
// 核心原则：严格复用 Lobe 社区商店的成熟组件和数据源
// - 数据：复用 useDiscoverStore 的 useFetchMcpList / useFetchSkillList / useAssistantList
// - 分类：复用 useMCPCategory / useSkillCategory / useCategory(Assistant) hook
// - 分类计数：复用 useMcpCategories / useSkillCategories / useAssistantCategories
// - 卡片：复用社区 MCP List / Skill List / Assistant List 组件
//
// 与 Lobe `createSkillStoreModal` 的区别：
// - createSkillStoreModal：三 Tab（LobeHub/Skills/MCP），无分类筛选，仅搜索
// - createUgsMarketModal：单类型 + 分类侧边栏 + 搜索 + 分页，更接近社区页面的体验
//
// 三页统一调用：
// - 能力中心：createUgsMarketModal('mcp', '能力市场')
// - 技能中心：createUgsMarketModal('skill', '技能市场')
// - 专家广场：createUgsMarketModal('agent', '专家市场')
import { createModal } from '@lobehub/ui/base-ui';
import { t } from 'i18next';

import { UgsMarketContent } from './UgsMarketContent';

export type UgsMarketType = 'agent' | 'mcp' | 'skill';

const TITLE_MAP: Record<UgsMarketType, string> = {
  agent: '专家市场',
  mcp: '能力市场',
  skill: '技能市场',
};

/**
 * 创建 UGS 市场弹窗（统一入口，复用 Lobe 社区商店组件）
 *
 * @param type  'mcp' = 能力市场（MCP 商店），'skill' = 技能市场，'agent' = 专家市场（助理商店）
 * @param title 弹窗标题（默认按 type 取 TITLE_MAP）
 */
export const createUgsMarketModal = (type: UgsMarketType, title?: string) =>
  createModal({
    content: <UgsMarketContent type={type} />,
    footer: null,
    title: title ?? TITLE_MAP[type] ?? t('skillStore.title', { ns: 'setting' }),
    width: 'min(90%, 1100px)',
  });
