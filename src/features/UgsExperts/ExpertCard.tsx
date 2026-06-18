// UGS-MODIFY: UGS-015 专家广场 — 专家卡片（增强版）
// 卡片信息：avatar / name / title / description / skill tags / counts(skills,tools,workflows) / action buttons
// 视觉与能力中心 CapabilityCard 统一（antd Card + outlined 风格 + 工业蓝配色）
import { MessageSquarePlus, Sparkles, Tool, Workflow } from 'lucide-react';
import { Button, Card, Tag } from 'antd';
import { type ReactNode, memo } from 'react';

import { type ExpertMeta, EXPERT_CATEGORIES } from './ugsExpertsData';
import type { ExpertCardMeta } from './expertSelectors';

interface ExpertCardProps {
  cardMeta: ExpertCardMeta;
  expert: ExpertMeta;
  loading?: boolean;
  /** 进入对话 */
  onChat?: () => void;
  /** 查看详情（打开 Drawer） */
  onOpenDetail?: () => void;
}

/** 单个统计项（图标 + 计数，hover 显示标签） */
const StatItem = ({
  count,
  icon,
  label,
}: {
  count: number;
  icon: ReactNode;
  label: string;
}) => (
  <span
    style={{
      alignItems: 'center',
      color: count > 0 ? '#595959' : '#bbb',
      display: 'inline-flex',
      fontSize: 11,
      gap: 3,
    }}
    title={`${label}：${count}`}
  >
    {icon}
    <span>{count}</span>
  </span>
);

const ExpertCard = memo<ExpertCardProps>(({ cardMeta, expert, loading, onChat, onOpenDetail }) => {
  const catMeta = EXPERT_CATEGORIES[expert.category];
  const isPlanned = cardMeta.planned;

  return (
    <Card
      hoverable={!isPlanned && !!onOpenDetail}
      loading={loading}
      onClick={isPlanned ? undefined : onOpenDetail}
      size="small"
      style={{
        borderColor: isPlanned ? '#f0f0f0' : '#e8e8e8',
        cursor: isPlanned ? 'default' : onOpenDetail ? 'pointer' : 'default',
        height: '100%',
        opacity: isPlanned ? 0.75 : 1,
        transition: 'all 0.2s ease',
      }}
      styles={{ body: { padding: 14, display: 'flex', flexDirection: 'column', height: '100%' } }}
    >
      {/* 头部：avatar + name + title + 分类 */}
      <div style={{ alignItems: 'center', display: 'flex', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 26, lineHeight: 1 }}>{expert.avatar}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
            <span
              style={{
                color: '#1f1f1f',
                fontSize: 14,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {expert.name}
            </span>
            {isPlanned && (
              <Tag color="processing" style={{ fontSize: 10, margin: 0 }}>
                规划中
              </Tag>
            )}
          </div>
          <span style={{ color: '#185FA5', fontSize: 11 }}>{expert.title}</span>
        </div>
      </div>

      {/* 描述 */}
      <div
        style={{
          color: '#595959',
          flex: 1,
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

      {/* 技能标签 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {cardMeta.tags.map((tag) => (
          <Tag
            key={tag}
            style={{
              background: '#f0f5ff',
              borderColor: '#d6e4ff',
              color: '#185FA5',
              fontSize: 11,
              margin: 0,
            }}
          >
            {tag}
          </Tag>
        ))}
        {expert.tags.length > 3 && (
          <span style={{ color: '#bbb', fontSize: 11, lineHeight: '20px' }}>
            +{expert.tags.length - 3}
          </span>
        )}
      </div>

      {/* 统计行：skills / tools / workflows */}
      <div
        style={{
          alignItems: 'center',
          borderTop: '1px solid #f5f5f5',
          display: 'flex',
          gap: 14,
          justifyContent: 'space-between',
          marginBottom: 10,
          paddingBottom: 8,
          paddingTop: 8,
        }}
      >
        <StatItem
          count={cardMeta.skillCount}
          icon={<Sparkles size={12} />}
          label="技能"
        />
        <StatItem count={cardMeta.toolCount} icon={<Tool size={12} />} label="工具" />
        <StatItem
          count={cardMeta.workflowCount}
          icon={<Workflow size={12} />}
          label="工作流"
        />
        <span
          style={{
            color: '#bbb',
            fontSize: 10,
            marginLeft: 'auto',
          }}
        >
          {catMeta.icon} {catMeta.label}
        </span>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          block
          disabled={isPlanned}
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail?.();
          }}
          size="small"
        >
          查看详情
        </Button>
        <Button
          block
          disabled={isPlanned}
          icon={<MessageSquarePlus size={14} />}
          loading={loading}
          onClick={(e) => {
            e.stopPropagation();
            onChat?.();
          }}
          size="small"
          style={{ background: '#2563EB', borderColor: '#2563EB' }}
          type="primary"
        >
          进入对话
        </Button>
      </div>
    </Card>
  );
});

export default ExpertCard;
