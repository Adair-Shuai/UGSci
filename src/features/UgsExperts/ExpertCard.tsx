// UGS-MODIFY: UGS-015 专家广场 — 专家卡片（增强版）
// 卡片信息：avatar / name / title / description / skill tags / counts(skills,tools,workflows) / action buttons
// 视觉与能力中心 ConnectorCard 统一：createStaticStyles + cssVar（主题感知，深浅色自动适配）
import { Button, Tag } from 'antd';
import { createStaticStyles } from 'antd-style';
import { MessageSquarePlus, Sparkles, Workflow,Wrench } from 'lucide-react';
import { memo,type ReactNode } from 'react';

import type { ExpertCardMeta } from './expertSelectors';
import { EXPERT_CATEGORIES,type ExpertMeta } from './ugsExpertsData';

const styles = createStaticStyles(({ css, cssVar }) => ({
  card: css`
    cursor: pointer;
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
  cardPlanned: css`
    cursor: default;
    height: 100%;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: ${cssVar.borderRadiusLG};
    background: ${cssVar.colorFillQuaternary};
    opacity: 0.75;
    transition: all 0.2s ease;
  `,
  cardBody: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 14px;
  `,
  avatar: css`
    font-size: 26px;
    line-height: 1;
  `,
  name: css`
    color: ${cssVar.colorText};
    font-size: 14px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  title: css`
    color: ${cssVar.colorPrimary};
    font-size: 11px;
  `,
  description: css`
    color: ${cssVar.colorTextSecondary};
    font-size: 12px;
    line-height: 1.5;
    flex: 1;
    margin-bottom: 8px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  `,
  tag: css`
    background: ${cssVar.colorFillTertiary};
    border-color: transparent;
    color: ${cssVar.colorTextSecondary};
    font-size: 11px;
    margin: 0;
  `,
  tagMore: css`
    color: ${cssVar.colorTextQuaternary};
    font-size: 11px;
    line-height: 20px;
  `,
  statItem: css`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
  `,
  statActive: css`
    color: ${cssVar.colorTextSecondary};
  `,
  statEmpty: css`
    color: ${cssVar.colorTextQuaternary};
  `,
  category: css`
    color: ${cssVar.colorTextQuaternary};
    font-size: 10px;
    margin-left: auto;
  `,
  statDivider: css`
    border-top: 1px solid ${cssVar.colorFillSecondary};
    padding-block: 8px;
    margin-bottom: 10px;
  `,
}));

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
    className={`${styles.statItem} ${count > 0 ? styles.statActive : styles.statEmpty}`}
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
    <div
      className={isPlanned ? styles.cardPlanned : styles.card}
      onClick={isPlanned ? undefined : onOpenDetail}
    >
      <div className={styles.cardBody}>
        {/* 头部：avatar + name + title + 分类 */}
        <div style={{ alignItems: 'center', display: 'flex', gap: 10, marginBottom: 8 }}>
          <span className={styles.avatar}>{expert.avatar}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
              <span className={styles.name}>{expert.name}</span>
              {isPlanned && (
                <Tag color="processing" style={{ fontSize: 10, margin: 0 }}>
                  规划中
                </Tag>
              )}
            </div>
            <span className={styles.title}>{expert.title}</span>
          </div>
        </div>

        {/* 描述 */}
        <div className={styles.description}>{expert.description}</div>

        {/* 技能标签 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {cardMeta.tags.map((tag) => (
            <Tag className={styles.tag} key={tag}>
              {tag}
            </Tag>
          ))}
          {expert.tags.length > 3 && (
            <span className={styles.tagMore}>+{expert.tags.length - 3}</span>
          )}
        </div>

        {/* 统计行：skills / tools / workflows */}
        <div
          className={styles.statDivider}
          style={{
            alignItems: 'center',
            display: 'flex',
            gap: 14,
            justifyContent: 'space-between',
            paddingTop: 8,
          }}
        >
          <StatItem
            count={cardMeta.skillCount}
            icon={<Sparkles size={12} />}
            label="技能"
          />
          <StatItem count={cardMeta.toolCount} icon={<Wrench size={12} />} label="工具" />
          <StatItem
            count={cardMeta.workflowCount}
            icon={<Workflow size={12} />}
            label="工作流"
          />
          <span className={styles.category}>
            {catMeta.icon} {catMeta.label}
          </span>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            block
            disabled={isPlanned}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail?.();
            }}
          >
            查看详情
          </Button>
          <Button
            block
            disabled={isPlanned}
            icon={<MessageSquarePlus size={14} />}
            loading={loading}
            size="small"
            type="primary"
            onClick={(e) => {
              e.stopPropagation();
              onChat?.();
            }}
          >
            进入对话
          </Button>
        </div>
      </div>
    </div>
  );
});

export default ExpertCard;
