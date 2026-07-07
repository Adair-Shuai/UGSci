// UGS-MODIFY: UGS-017 技能中心 — 已安装技能 Tab
//
// 只展示已安装的 Lobe builtin skills（Agent Skills），不包含 builtinTools 或 MCP。
// 卡片模板复用 Lobe `BuiltinItem`，详情复用 Lobe `createBuiltinAgentSkillDetailModal`。
import { Empty, Input, Skeleton } from 'antd';
import { createStaticStyles } from 'antd-style';
import { Search } from 'lucide-react';
import { type FC, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { createBuiltinAgentSkillDetailModal } from '@/features/SkillStore/SkillDetail';
import BuiltinItem from '@/features/SkillStore/SkillList/Builtin/Item';
import { useToolStore } from '@/store/tool';

const styles = createStaticStyles(({ css, cssVar, responsive }) => ({
  container: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  toolbar: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  searchInput: css`
    max-width: 280px;

    .ant-input-affix-wrapper {
      background: ${cssVar.colorBgContainer};
      border-color: ${cssVar.colorBorderSecondary};
    }
  `,
  hint: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 12px;
    margin-right: auto;
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

interface InstalledTabProps {
  keyword: string;
  loading?: boolean;
}

const InstalledTab: FC<InstalledTabProps> = ({ keyword, loading }) => {
  const { t } = useTranslation('setting');
  const [localKeyword, setLocalKeyword] = useState('');

  // 只从 builtinSkills 查（不查 builtinTools / MCP）
  const builtinSkills = useToolStore((s) => s.builtinSkills ?? []);

  // 合并关键词：全局 keyword + 本地搜索框
  const finalKeyword = (keyword || localKeyword).trim().toLowerCase();

  const entries = useMemo(() => {
    return builtinSkills.map((skill) => ({
      avatar: skill.avatar,
      description:
        t(`tools.builtins.${skill.identifier}.description`, {
          defaultValue: skill.description ?? '',
        }) ?? '',
      identifier: skill.identifier,
      title:
        t(`tools.builtins.${skill.identifier}.title`, {
          defaultValue: skill.name ?? skill.identifier,
        }) ?? skill.identifier,
    }));
  }, [builtinSkills, t]);

  // 关键词过滤
  const filtered = useMemo(() => {
    if (!finalKeyword) return entries;
    return entries.filter((e) => {
      if (e.title.toLowerCase().includes(finalKeyword)) return true;
      if (e.identifier.toLowerCase().includes(finalKeyword)) return true;
      if (e.description.toLowerCase().includes(finalKeyword)) return true;
      return false;
    });
  }, [entries, finalKeyword]);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <span className={styles.hint}>
          共 {entries.length} 个已安装技能 · 点击卡片查看详情
        </span>
        <Input
          allowClear
          className={styles.searchInput}
          placeholder="在已安装中搜索"
          prefix={<Search size={14} />}
          size="small"
          value={localKeyword}
          onChange={(e) => setLocalKeyword(e.target.value)}
        />
      </div>

      {loading && builtinSkills.length === 0 ? (
        <div style={{ padding: '24px 0' }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : filtered.length === 0 ? (
        <Empty
          description={finalKeyword ? `未找到匹配「${finalKeyword}」的已安装技能` : '暂无已安装技能'}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 48 }}
        />
      ) : (
        <div className={styles.grid}>
          {filtered.map((entry) => (
            <BuiltinItem
              avatar={entry.avatar}
              description={entry.description}
              identifier={entry.identifier}
              key={entry.identifier}
              title={entry.title}
              onOpenDetail={() =>
                createBuiltinAgentSkillDetailModal({ identifier: entry.identifier })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default InstalledTab;
