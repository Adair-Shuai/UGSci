// UGS-MODIFY: UGS-015 储气库专家市场页 - 专家卡片
import { Card, Tag } from 'antd';
import { memo } from 'react';

import { CATEGORY_LABELS, type ExpertMeta } from './ugsExpertsData';

interface ExpertCardProps {
  expert: ExpertMeta;
  loading?: boolean;
  onClick?: () => void;
}

const ExpertCard = memo<ExpertCardProps>(({ expert, loading, onClick }) => {
  return (
    <Card
      hoverable
      loading={loading}
      onClick={onClick}
      size="small"
      style={{
        borderColor: '#e8e8e8',
        cursor: onClick ? 'pointer' : 'default',
        height: '100%',
        transition: 'all 0.2s',
      }}
      styles={{ body: { padding: 14 } }}
    >
      <div style={{ alignItems: 'center', display: 'flex', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 24 }}>{expert.avatar}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1f1f1f' }}>{expert.name}</div>
          <span style={{ color: '#888', fontSize: 11 }}>
            {CATEGORY_LABELS[expert.category]}
          </span>
        </div>
      </div>
      <div
        style={{
          color: '#595959',
          fontSize: 12,
          lineHeight: 1.5,
          marginBottom: 8,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {expert.description}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {expert.tags.slice(0, 3).map((tag) => (
          <Tag key={tag} style={{ fontSize: 11, margin: 0 }}>
            {tag}
          </Tag>
        ))}
      </div>
    </Card>
  );
});

export default ExpertCard;
