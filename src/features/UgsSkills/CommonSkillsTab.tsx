// UGS-MODIFY: UGS-017 技能中心 — 常用技能 Tab
//
// 与「已安装」Tab 并列的第一个 Tab。
// 展示油气领域和储气库方面的常用 Lobe builtin skill（Agent Skills，非 tools、非 MCP）。
// 常用技能列表来自 `ugsCommonSkills.ts` 动态配置，不硬编码。
// 卡片模板复用 Lobe `BuiltinItem`，详情复用 Lobe `createBuiltinAgentSkillDetailModal`。
// 移除了「为你推荐」横向滚动模块。
import { Empty } from 'antd';
import { createStaticStyles } from 'antd-style';
import { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { createBuiltinAgentSkillDetailModal } from '@/features/SkillStore/SkillDetail';
import BuiltinItem from '@/features/SkillStore/SkillList/Builtin/Item';
import { useToolStore } from '@/store/tool';

import {
  UGS_COMMON_SKILLS,
  UGS_SKILL_GROUP_LABELS,
  UGS_SKILL_GROUP_ORDER,
  type UgsCommonSkillEntry,
} from './ugsCommonSkills';

const styles = createStaticStyles(({ css, cssVar, responsive }) => ({
  container: css`
    display: flex;
    flex-direction: column;
    gap: 20px;
  `,
  groupSection: css`
    margin-bottom: 8px;
  `,
  groupTitle: css`
    color: ${cssVar.colorText};
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;

    &::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 14px;
      background: ${cssVar.colorPrimary};
      border-radius: 2px;
    }
  `,
  groupCount: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 12px;
    font-weight: 400;
  `,
  grid: css`
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(3, 1fr);

    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
    }
    ${responsive.sm} {
      grid-template-columns: 1fr;
    }
  `,
}));

interface CommonSkillsTabProps {
  keyword: string;
}

const CommonSkillsTab: FC<CommonSkillsTabProps> = ({ keyword }) => {
  const { t } = useTranslation('setting');

  // 只从 builtinSkills 查（不查 builtinTools / MCP）
  // builtinSkills 是 LobeChat 的 Agent Skills，与 builtinTools（工具）和 MCP（外部工具）严格区分
  const builtinSkills = useToolStore((s) => s.builtinSkills ?? []);

  // 关键词过滤
  const k = keyword.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    if (!k) return UGS_COMMON_SKILLS;
    return UGS_COMMON_SKILLS.filter((entry) => {
      if (entry.identifier.toLowerCase().includes(k)) return true;
      if (entry.customTitle?.toLowerCase().includes(k)) return true;
      if (entry.customDescription?.toLowerCase().includes(k)) return true;
      return false;
    });
  }, [k]);

  // 按分组归类
  const groupedEntries = useMemo(() => {
    const groups: Record<string, UgsCommonSkillEntry[]> = {};
    for (const entry of filteredEntries) {
      const g = entry.group ?? 'general';
      if (!groups[g]) groups[g] = [];
      groups[g].push(entry);
    }
    return groups;
  }, [filteredEntries]);

  if (filteredEntries.length === 0) {
    return (
      <Empty
        description={k ? `未找到匹配「${k}」的常用技能` : '暂无常用技能'}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ marginTop: 48 }}
      />
    );
  }

  return (
    <div className={styles.container}>
      {UGS_SKILL_GROUP_ORDER.map((group) => {
        const entries = groupedEntries[group] ?? [];
        if (entries.length === 0) return null;
        return (
          <div className={styles.groupSection} key={group}>
            <h3 className={styles.groupTitle}>
              {UGS_SKILL_GROUP_LABELS[group]}
              <span className={styles.groupCount}>（{entries.length}）</span>
            </h3>
            <div className={styles.grid}>
              {entries.map((entry) => {
                // 从 builtinSkills 查找对应的 skill 对象（取 avatar / 默认标题/描述）
                const skill = builtinSkills.find((s) => s.identifier === entry.identifier);

                // 标题/描述：优先 customTitle/customDescription，否则用 BuiltinSkill 对象
                const title =
                  entry.customTitle ??
                  t(`tools.builtins.${entry.identifier}.title`, {
                    defaultValue: skill?.name ?? entry.identifier,
                  });
                const description =
                  entry.customDescription ??
                  t(`tools.builtins.${entry.identifier}.description`, {
                    defaultValue: skill?.description ?? '',
                  });

                return (
                  <BuiltinItem
                    avatar={skill?.avatar}
                    description={description}
                    identifier={entry.identifier}
                    key={entry.identifier}
                    title={title}
                    onOpenDetail={() =>
                      createBuiltinAgentSkillDetailModal({ identifier: entry.identifier })
                    }
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CommonSkillsTab;
