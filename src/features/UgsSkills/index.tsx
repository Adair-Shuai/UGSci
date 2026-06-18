// UGS-MODIFY: UGS-017 储气库技能中心 - 移植 LobeHub 现成技能管理页面
import { type FC } from 'react';

import SkillSettingsPage from '@/routes/(main)/settings/skill';

/**
 * 技能中心直接复用 LobeHub 的 settings/skill 页面
 * 该页面含：连接器/技能 Tab、技能列表、技能详情、导入按钮、商店入口
 * 后续可在此 wrapper 层叠加 UGSci 特定的技能分类（PVT/储层/产能等）
 */
const UgsSkillsPage: FC = () => {
  return <SkillSettingsPage />;
};

export default UgsSkillsPage;
