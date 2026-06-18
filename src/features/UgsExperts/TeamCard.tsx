// UGS-MODIFY: UGS-015 储气库专家市场页 - 专家团卡片
// 视觉与专家卡片 / 能力中心 ConnectorCard 统一：createStaticStyles + cssVar
import { Avatar, Button, Tag, Tooltip } from 'antd';
import { createStaticStyles } from 'antd-style';
import { memo } from 'react';

import { BUILTIN_AGENTS } from '@lobechat/builtin-agents';

import { UGS_EXPERTS } from './ugsExpertsData';
import type { ExpertTeamMeta } from './ugsExpertsData';

const styles = createStaticStyles(({ css, cssVar }) => ({
  card: css`
    height: 100%;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: ${cssVar.borderRadiusLG};
    background: ${cssVar.colorBgContainer};
    transition: all 0.2s ease;

    &:hover {
      border-color: ${cssVar.colorPrimary};
      box-shadow: ${cssVar.boxShadowTertiary};
    }
  `,
  cardBody: css`
    padding: 16px;
  `,
  teamName: css`
    color: ${cssVar.colorText};
    font-size: 15px;
    font-weight: 500;
  `,
  teamMeta: css`
    color: ${cssVar.colorPrimary};
    font-size: 11px;
  `,
  description: css`
    color: ${cssVar.colorTextSecondary};
    font-size: 12px;
    line-height: 1.5;
    margin-bottom: 10px;
  `,
  memberLabel: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 11px;
    margin-right: 4px;
  `,
  taskLabel: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 11px;
    margin-bottom: 4px;
  `,
  taskTag: css`
    background: ${cssVar.colorFillTertiary};
    border-color: transparent;
    color: ${cssVar.colorTextSecondary};
    font-size: 11px;
    margin: 0 4px 4px 0;
    max-width: 100%;
  `,
  avatar: css`
    background: ${cssVar.colorFillTertiary};
    border: 1px solid ${cssVar.colorBgContainer};
    color: ${cssVar.colorPrimary};
    font-size: 14px;
  `,
}));

interface TeamCardProps {
  loading?: boolean;
  onSummon?: () => void;
  team: ExpertTeamMeta;
}

const TeamCard = memo<TeamCardProps>(({ loading, onSummon, team }) => {
  // 从 BUILTIN_AGENTS 读取成员 avatar + 从 UGS_EXPERTS 读展示名
  const members = team.memberSlugs.map((slug) => {
    const agent = BUILTIN_AGENTS[slug as keyof typeof BUILTIN_AGENTS];
    const meta = UGS_EXPERTS.find((e) => e.slug === slug);
    return {
      avatar: agent?.avatar ?? '❓',
      name: meta?.name ?? slug,
      slug,
    };
  });

  return (
    <div className={styles.card}>
      <div className={styles.cardBody}>
        <div style={{ alignItems: 'center', display: 'flex', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>👥</span>
          <div style={{ flex: 1 }}>
            <div className={styles.teamName}>{team.name}</div>
            <span className={styles.teamMeta}>
              专家团 · {team.memberSlugs.length} 位成员
            </span>
          </div>
        </div>

        <div className={styles.description}>{team.description}</div>

        {/* 成员头像组（重叠展示） */}
        <div style={{ alignItems: 'center', display: 'flex', gap: 4, marginBottom: 10 }}>
          <span className={styles.memberLabel}>成员：</span>
          <Avatar.Group maxCount={4} size="small">
            {members.map((m) => (
              <Tooltip key={m.slug} title={m.name}>
                <Avatar className={styles.avatar} size="small">
                  {m.avatar}
                </Avatar>
              </Tooltip>
            ))}
          </Avatar.Group>
        </div>

        {/* 典型任务 */}
        <div style={{ marginBottom: 12 }}>
          <div className={styles.taskLabel}>典型任务：</div>
          {team.tasks.slice(0, 2).map((task, i) => (
            <Tag key={i} className={styles.taskTag}>
              {task.length > 30 ? task.slice(0, 30) + '…' : task}
            </Tag>
          ))}
        </div>

        <Button block loading={loading} onClick={onSummon} type="primary">
          召唤团队
        </Button>
      </div>
    </div>
  );
});

export default TeamCard;
