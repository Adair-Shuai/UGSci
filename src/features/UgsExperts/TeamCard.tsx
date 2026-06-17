// UGS-MODIFY: UGS-015 储气库专家市场页 - 专家团卡片
import { Button, Card, Tag } from 'antd';
import { memo } from 'react';

import { BUILTIN_AGENTS } from '@lobechat/builtin-agents';

import type { ExpertTeamMeta } from './ugsExpertsData';

interface TeamCardProps {
  loading?: boolean;
  onSummon?: () => void;
  team: ExpertTeamMeta;
}

const TeamCard = memo<TeamCardProps>(({ loading, onSummon, team }) => {
  // 从 BUILTIN_AGENTS 读取成员 avatar 用于展示
  const memberAvatars = team.memberSlugs.map((slug) => {
    const agent = BUILTIN_AGENTS[slug as keyof typeof BUILTIN_AGENTS];
    return agent?.avatar ?? '❓';
  });

  return (
    <Card
      size="small"
      style={{
        borderColor: '#d6e4ff',
        height: '100%',
      }}
      styles={{ body: { padding: 16 } }}
    >
      <div style={{ alignItems: 'center', display: 'flex', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>👥</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1f1f1f' }}>{team.name}</div>
          <span style={{ color: '#185FA5', fontSize: 11 }}>专家团 · {team.memberSlugs.length} 位成员</span>
        </div>
      </div>

      <div
        style={{
          color: '#595959',
          fontSize: 12,
          lineHeight: 1.5,
          marginBottom: 10,
        }}
      >
        {team.description}
      </div>

      {/* 成员头像组 */}
      <div style={{ alignItems: 'center', display: 'flex', gap: 6, marginBottom: 10 }}>
        <span style={{ color: '#888', fontSize: 11 }}>成员：</span>
        {memberAvatars.map((avatar, i) => (
          <span key={i} style={{ fontSize: 18 }}>
            {avatar}
          </span>
        ))}
      </div>

      {/* 典型任务 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>典型任务：</div>
        {team.tasks.slice(0, 2).map((task, i) => (
          <Tag
            key={i}
            style={{ fontSize: 11, margin: '0 4px 4px 0', maxWidth: '100%' }}
          >
            {task.length > 30 ? task.slice(0, 30) + '…' : task}
          </Tag>
        ))}
      </div>

      <Button
        block
        loading={loading}
        onClick={onSummon}
        style={{ background: '#2563EB', borderColor: '#2563EB' }}
        type="primary"
      >
        召唤团队
      </Button>
    </Card>
  );
});

export default TeamCard;
