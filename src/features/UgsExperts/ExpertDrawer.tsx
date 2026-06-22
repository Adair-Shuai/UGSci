// UGS-MODIFY: UGS-015 专家广场 — 专家详情 Drawer（5 Tab）
// Tabs: Profile / Skills / Tools / Team / Workflows
// 复用现有 toolStore（只读 connectorList）展示关联工具，不修改任何 store / 编辑器组件。
// 视觉与能力中心统一：createStaticStyles + cssVar（深浅色自动适配）
import { Avatar, Button, Drawer, Empty, List, Steps, Tabs, Tag, Typography } from 'antd';
import { createStaticStyles } from 'antd-style';
import { MessageSquarePlus } from 'lucide-react';
import { type FC, useMemo, useState } from 'react';

import { useToolStore } from '@/store/tool';
import { connectorSelectors } from '@/store/tool/slices/connector';

import { selectTeamsByExpertSlug } from './expertSelectors';
import { EXPERT_CATEGORIES, type ExpertMeta, UGS_EXPERTS } from './ugsExpertsData';

const { Paragraph, Text, Title } = Typography;

const styles = createStaticStyles(({ css, cssVar }) => ({
  drawerBody: css`
    .ant-drawer-body {
      background: ${cssVar.colorBgLayout};
    }
  `,
  sectionLabel: css`
    font-size: 12px;
    color: ${cssVar.colorTextTertiary};
  `,
  sectionBody: css`
    margin-block-start: 4px;
    font-size: 13px;
    color: ${cssVar.colorTextSecondary};
  `,
  name: css`
    color: ${cssVar.colorText} !important;
  `,
  title: css`
    font-size: 13px;
    color: ${cssVar.colorPrimary};
  `,
  description: css`
    margin-block: 4px 0;
    font-size: 13px;
    color: ${cssVar.colorTextSecondary};
  `,
  tag: css`
    border-color: transparent;
    color: ${cssVar.colorTextSecondary};
    background: ${cssVar.colorFillTertiary};
  `,
  skillNumber: css`
    flex-shrink: 0;
    font-size: 12px;
    color: #fff;
    background: ${cssVar.colorPrimary};
  `,
  skillText: css`
    font-size: 13px;
    color: ${cssVar.colorText};
  `,
  listItem: css`
    border-block-end: 1px dashed ${cssVar.colorBorderSecondary} !important;
  `,
  toolName: css`
    font-size: 13px;
    color: ${cssVar.colorText};
  `,
  toolMeta: css`
    margin-block-start: 4px;
    font-size: 11px;
    color: ${cssVar.colorTextTertiary};
  `,
  teamName: css`
    font-size: 13px;
    font-weight: 500;
    color: ${cssVar.colorText};
  `,
  teamDesc: css`
    margin-block: 6px;
    margin-inline: 0;
    font-size: 12px;
    color: ${cssVar.colorTextSecondary};
  `,
  workflowStepTitle: css`
    font-size: 13px;
    color: ${cssVar.colorText};
  `,
  workflowStepDesc: css`
    font-size: 12px;
    color: ${cssVar.colorTextTertiary};
  `,
  emptyHint: css`
    font-size: 12px;
    color: ${cssVar.colorTextTertiary};
  `,
}));

interface ExpertDrawerProps {
  expert: ExpertMeta | null;
  loading?: boolean;
  onChat?: () => void;
  onClose?: () => void;
  open: boolean;
}

type TabKey = 'profile' | 'skills' | 'tools' | 'team' | 'workflows';

const ExpertDrawer: FC<ExpertDrawerProps> = ({ expert, loading, onClose, onChat, open }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  // 只读 toolStore：获取全部 connector 用于匹配推荐工具
  const connectors = useToolStore(connectorSelectors.connectorList);

  const teams = useMemo(() => (expert ? selectTeamsByExpertSlug(expert.slug) : []), [expert]);

  // Tools Tab：匹配 recommendedTools 与已安装 connector
  const matchedTools = useMemo(() => {
    if (!expert) return [];
    return expert.recommendedTools.map((identifier) => {
      const conn = connectors.find((c) => c.identifier === identifier);
      return {
        connected: conn?.status === 'connected',
        functionCount: conn?.tools?.length ?? 0,
        identifier,
        name: conn?.name ?? identifier,
      };
    });
  }, [expert, connectors]);

  if (!expert) return null;

  const catMeta = EXPERT_CATEGORIES[expert.category];
  const isPlanned = !!expert.planned;

  // 成员名映射（Team Tab 用）
  const memberName = (slug: string) => UGS_EXPERTS.find((e) => e.slug === slug)?.name ?? slug;

  // ===== Profile Tab =====
  const profileTab = (
    <div style={{ padding: '4px 4px 16px' }}>
      <div style={{ alignItems: 'center', display: 'flex', gap: 14, marginBottom: 16 }}>
        <Avatar
          size={56}
          style={{
            background: 'var(--colorFillTertiary)',
            color: 'var(--colorPrimary)',
            fontSize: 30,
          }}
        >
          {expert.avatar}
        </Avatar>
        <div>
          <Title className={styles.name} level={5} style={{ margin: 0 }}>
            {expert.name}
          </Title>
          <span className={styles.title}>{expert.title}</span>
          <div style={{ marginTop: 4 }}>
            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
              {catMeta.icon} {catMeta.label}
            </Tag>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text className={styles.sectionLabel}>专家简介</Text>
        <Paragraph className={styles.description}>{expert.description}</Paragraph>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text className={styles.sectionLabel}>技能标签</Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {expert.tags.map((tag) => (
            <Tag className={styles.tag} key={tag}>
              {tag}
            </Tag>
          ))}
        </div>
      </div>

      <div>
        <Text className={styles.sectionLabel}>
          能力概览（{expert.skills.length} 项技能 · {expert.recommendedTools.length} 项工具 ·{' '}
          {expert.workflowSteps.length} 步工作流）
        </Text>
        <List
          dataSource={expert.skills}
          size="small"
          style={{ marginTop: 6 }}
          renderItem={(s) => (
            <List.Item className={styles.listItem} style={{ padding: '6px 0' }}>
              <Text className={styles.skillText}>
                <span style={{ color: 'var(--colorPrimary)', marginRight: 8 }}>·</span>
                {s}
              </Text>
            </List.Item>
          )}
        />
      </div>
    </div>
  );

  // ===== Skills Tab =====
  const skillsTab = (
    <div style={{ padding: '4px 4px 16px' }}>
      <Text className={styles.sectionLabel}>核心能力点</Text>
      <List
        dataSource={expert.skills}
        style={{ marginTop: 8 }}
        renderItem={(s, i) => (
          <List.Item style={{ padding: '10px 0' }}>
            <div style={{ alignItems: 'center', display: 'flex', gap: 10, width: '100%' }}>
              <Avatar className={styles.skillNumber} size={28}>
                {i + 1}
              </Avatar>
              <Text className={styles.skillText}>{s}</Text>
            </div>
          </List.Item>
        )}
      />
      <div style={{ marginTop: 16 }}>
        <Text className={styles.sectionLabel}>标签</Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {expert.tags.map((tag) => (
            <Tag color="blue" key={tag}>
              {tag}
            </Tag>
          ))}
        </div>
      </div>
    </div>
  );

  // ===== Tools Tab =====
  const toolsTab = (
    <div style={{ padding: '4px 4px 16px' }}>
      <Text className={styles.sectionLabel}>关联能力 / 工具（来自能力中心）</Text>
      {matchedTools.length === 0 ? (
        <Empty
          description={
            <span className={styles.emptyHint}>该专家为知识型专家，暂无关联外部工具</span>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 24 }}
        />
      ) : (
        <List
          dataSource={matchedTools}
          style={{ marginTop: 8 }}
          renderItem={(t) => (
            <List.Item style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <Text className={styles.toolName}>{t.name}</Text>
                  <div>
                    <Text code style={{ fontSize: 11 }}>
                      {t.identifier}
                    </Text>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Tag color={t.connected ? 'success' : 'default'} style={{ margin: 0 }}>
                    {t.connected ? '已连接' : '未连接'}
                  </Tag>
                  <div className={styles.toolMeta}>
                    {t.functionCount > 0 ? `${t.functionCount} 个功能` : '—'}
                  </div>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  // ===== Team Tab =====
  const teamTab = (
    <div style={{ padding: '4px 4px 16px' }}>
      <Text className={styles.sectionLabel}>该专家参与的专家团（Team Relations）</Text>
      {teams.length === 0 ? (
        <Empty
          description={<span className={styles.emptyHint}>该专家暂未加入任何预置专家团</span>}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 24 }}
        />
      ) : (
        <List
          dataSource={teams}
          style={{ marginTop: 8 }}
          renderItem={(team) => (
            <List.Item style={{ padding: '12px 0', alignItems: 'flex-start' }}>
              <div style={{ width: '100%' }}>
                <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>👥</span>
                  <Text className={styles.teamName}>{team.name}</Text>
                </div>
                <Paragraph className={styles.teamDesc}>{team.description}</Paragraph>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {team.memberSlugs.map((slug) => (
                    <Tag
                      color={slug === expert.slug ? 'blue' : 'default'}
                      key={slug}
                      style={{ fontSize: 11, margin: 0 }}
                    >
                      {memberName(slug)}
                    </Tag>
                  ))}
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  // ===== Workflows Tab =====
  const workflowsTab = (
    <div style={{ padding: '4px 4px 16px' }}>
      <Text className={styles.sectionLabel}>标准工作流（{expert.workflowSteps.length} 步）</Text>
      <Steps
        current={expert.workflowSteps.length - 1}
        direction="vertical"
        size="small"
        style={{ marginTop: 16 }}
        items={expert.workflowSteps.map((step, i) => ({
          description: <span className={styles.workflowStepDesc}>{`第 ${i + 1} 步`}</span>,
          title: <span className={styles.workflowStepTitle}>{step}</span>,
        }))}
      />
    </div>
  );

  const tabItems = [
    { children: profileTab, key: 'profile', label: 'Profile' },
    {
      children: skillsTab,
      key: 'skills',
      label: `Skills (${expert.skills.length})`,
    },
    {
      children: toolsTab,
      key: 'tools',
      label: `Tools (${expert.recommendedTools.length})`,
    },
    { children: teamTab, key: 'team', label: `Team (${teams.length})` },
    {
      children: workflowsTab,
      key: 'workflows',
      label: `Workflows (${expert.workflowSteps.length})`,
    },
  ];

  return (
    <Drawer
      className={styles.drawerBody}
      open={open}
      size={520}
      extra={
        <Button
          disabled={isPlanned}
          icon={<MessageSquarePlus size={14} />}
          loading={loading}
          type="primary"
          onClick={onChat}
        >
          进入对话
        </Button>
      }
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{expert.avatar}</span>
          <span style={{ color: 'var(--colorText)' }}>{expert.name}</span>
        </div>
      }
      onClose={onClose}
    >
      <Tabs
        activeKey={activeTab}
        items={tabItems}
        size="small"
        onChange={(k) => setActiveTab(k as TabKey)}
      />
    </Drawer>
  );
};

export default ExpertDrawer;
