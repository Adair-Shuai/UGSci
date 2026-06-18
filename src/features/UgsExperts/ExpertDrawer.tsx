// UGS-MODIFY: UGS-015 专家广场 — 专家详情 Drawer（5 Tab）
// Tabs: Profile / Skills / Tools / Team / Workflows
// 复用现有 toolStore（只读 connectorList）展示关联工具，不修改任何 store / 编辑器组件。
// 视觉与能力中心统一：createStaticStyles + cssVar（深浅色自动适配）
import { MessageSquarePlus } from 'lucide-react';
import { createStaticStyles } from 'antd-style';
import { Avatar, Button, Drawer, Empty, List, Steps, Tabs, Tag, Typography } from 'antd';
import { type FC, useMemo, useState } from 'react';

import { useToolStore } from '@/store/tool';
import { connectorSelectors } from '@/store/tool/slices/connector';

import { selectTeamsByExpertSlug } from './expertSelectors';
import { type ExpertMeta, EXPERT_CATEGORIES, UGS_EXPERTS } from './ugsExpertsData';

const { Paragraph, Text, Title } = Typography;

const styles = createStaticStyles(({ css, cssVar }) => ({
  drawerBody: css`
    .ant-drawer-body {
      background: ${cssVar.colorBgLayout};
    }
  `,
  sectionLabel: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 12px;
  `,
  sectionBody: css`
    color: ${cssVar.colorTextSecondary};
    font-size: 13px;
    margin-top: 4px;
  `,
  name: css`
    color: ${cssVar.colorText} !important;
  `,
  title: css`
    color: ${cssVar.colorPrimary};
    font-size: 13px;
  `,
  description: css`
    color: ${cssVar.colorTextSecondary};
    font-size: 13px;
    margin-top: 4px;
    margin-bottom: 0;
  `,
  tag: css`
    background: ${cssVar.colorFillTertiary};
    border-color: transparent;
    color: ${cssVar.colorTextSecondary};
  `,
  skillNumber: css`
    background: ${cssVar.colorPrimary};
    color: #fff;
    font-size: 12px;
    flex-shrink: 0;
  `,
  skillText: css`
    color: ${cssVar.colorText};
    font-size: 13px;
  `,
  listItem: css`
    border-bottom: 1px dashed ${cssVar.colorBorderSecondary} !important;
  `,
  toolName: css`
    color: ${cssVar.colorText};
    font-size: 13px;
  `,
  toolMeta: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 11px;
    margin-top: 4px;
  `,
  teamName: css`
    color: ${cssVar.colorText};
    font-size: 13px;
    font-weight: 500;
  `,
  teamDesc: css`
    color: ${cssVar.colorTextSecondary};
    font-size: 12px;
    margin: 6px 0;
  `,
  workflowStepTitle: css`
    color: ${cssVar.colorText};
    font-size: 13px;
  `,
  workflowStepDesc: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 12px;
  `,
  emptyHint: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 12px;
  `,
}));

interface ExpertDrawerProps {
  expert: ExpertMeta | null;
  loading?: boolean;
  onClose?: () => void;
  onChat?: () => void;
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
        <Avatar size={56} style={{ background: 'var(--colorFillTertiary)', color: 'var(--colorPrimary)', fontSize: 30 }}>
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
            <Tag key={tag} className={styles.tag}>
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
          renderItem={(s) => (
            <List.Item className={styles.listItem} style={{ padding: '6px 0' }}>
              <Text className={styles.skillText}>
                <span style={{ color: 'var(--colorPrimary)', marginRight: 8 }}>·</span>
                {s}
              </Text>
            </List.Item>
          )}
          size="small"
          style={{ marginTop: 6 }}
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
        style={{ marginTop: 8 }}
      />
      <div style={{ marginTop: 16 }}>
        <Text className={styles.sectionLabel}>标签</Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {expert.tags.map((tag) => (
            <Tag key={tag} color="blue">
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
          description={<span className={styles.emptyHint}>该专家为知识型专家，暂无关联外部工具</span>}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 24 }}
        />
      ) : (
        <List
          dataSource={matchedTools}
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
          style={{ marginTop: 8 }}
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
                      key={slug}
                      color={slug === expert.slug ? 'blue' : 'default'}
                      style={{ fontSize: 11, margin: 0 }}
                    >
                      {memberName(slug)}
                    </Tag>
                  ))}
                </div>
              </div>
            </List.Item>
          )}
          style={{ marginTop: 8 }}
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
        items={expert.workflowSteps.map((step, i) => ({
          description: <span className={styles.workflowStepDesc}>{`第 ${i + 1} 步`}</span>,
          title: <span className={styles.workflowStepTitle}>{step}</span>,
        }))}
        size="small"
        style={{ marginTop: 16 }}
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
      extra={
        <Button
          disabled={isPlanned}
          icon={<MessageSquarePlus size={14} />}
          loading={loading}
          onClick={onChat}
          type="primary"
        >
          进入对话
        </Button>
      }
      onClose={onClose}
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{expert.avatar}</span>
          <span style={{ color: 'var(--colorText)' }}>{expert.name}</span>
        </div>
      }
      width={520}
    >
      <Tabs
        activeKey={activeTab}
        items={tabItems}
        onChange={(k) => setActiveTab(k as TabKey)}
        size="small"
      />
    </Drawer>
  );
};

export default ExpertDrawer;
