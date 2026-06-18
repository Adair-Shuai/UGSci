// UGS-MODIFY: UGS-015 专家广场 — 专家详情 Drawer（5 Tab）
// Tabs: Profile / Skills / Tools / Team / Workflows
// 复用现有 toolStore（只读 connectorList）展示关联工具，不修改任何 store / 编辑器组件。
import { MessageSquarePlus } from 'lucide-react';
import { Avatar, Button, Drawer, Empty, List, Steps, Tabs, Tag, Typography } from 'antd';
import { type FC, useMemo, useState } from 'react';

import { useToolStore } from '@/store/tool';
import { connectorSelectors } from '@/store/tool/slices/connector';

import { selectTeamsByExpertSlug } from './expertSelectors';
import { type ExpertMeta, EXPERT_CATEGORIES, UGS_EXPERTS } from './ugsExpertsData';

const { Paragraph, Text, Title } = Typography;

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
        <Avatar size={56} style={{ background: '#f0f5ff', color: '#185FA5', fontSize: 30 }}>
          {expert.avatar}
        </Avatar>
        <div>
          <Title level={5} style={{ color: '#1f1f1f', margin: 0 }}>
            {expert.name}
          </Title>
          <Text style={{ color: '#185FA5', fontSize: 13 }}>{expert.title}</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
              {catMeta.icon} {catMeta.label}
            </Tag>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          专家简介
        </Text>
        <Paragraph style={{ color: '#595959', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
          {expert.description}
        </Paragraph>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          技能标签
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {expert.tags.map((tag) => (
            <Tag
              key={tag}
              style={{ background: '#f0f5ff', borderColor: '#d6e4ff', color: '#185FA5' }}
            >
              {tag}
            </Tag>
          ))}
        </div>
      </div>

      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          能力概览（{expert.skills.length} 项技能 · {expert.recommendedTools.length} 项工具 ·{' '}
          {expert.workflowSteps.length} 步工作流）
        </Text>
        <List
          dataSource={expert.skills}
          renderItem={(s, i) => (
            <List.Item style={{ padding: '6px 0', borderBottom: '1px dashed #f0f0f0' }}>
              <Text style={{ color: '#595959', fontSize: 13 }}>
                <Text style={{ color: '#185FA5', marginRight: 8 }}>·</Text>
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
      <Text type="secondary" style={{ fontSize: 12 }}>
        核心能力点
      </Text>
      <List
        dataSource={expert.skills}
        renderItem={(s, i) => (
          <List.Item style={{ padding: '10px 0' }}>
            <div style={{ alignItems: 'center', display: 'flex', gap: 10, width: '100%' }}>
              <Avatar
                size={28}
                style={{ background: '#185FA5', color: '#fff', fontSize: 12, flexShrink: 0 }}
              >
                {i + 1}
              </Avatar>
              <Text style={{ color: '#1f1f1f', fontSize: 13 }}>{s}</Text>
            </div>
          </List.Item>
        )}
        style={{ marginTop: 8 }}
      />
      <div style={{ marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          标签
        </Text>
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
      <Text type="secondary" style={{ fontSize: 12 }}>
        关联能力 / 工具（来自能力中心）
      </Text>
      {matchedTools.length === 0 ? (
        <Empty
          description={
            <span style={{ color: '#888', fontSize: 12 }}>
              该专家为知识型专家，暂无关联外部工具
            </span>
          }
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
                  <Text style={{ color: '#1f1f1f', fontSize: 13 }}>{t.name}</Text>
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
                  <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
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
      <Text type="secondary" style={{ fontSize: 12 }}>
        该专家参与的专家团（Team Relations）
      </Text>
      {teams.length === 0 ? (
        <Empty
          description={
            <span style={{ color: '#888', fontSize: 12 }}>该专家暂未加入任何预置专家团</span>
          }
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
                  <Text style={{ color: '#1f1f1f', fontSize: 13, fontWeight: 500 }}>
                    {team.name}
                  </Text>
                </div>
                <Paragraph
                  style={{ color: '#595959', fontSize: 12, margin: '6px 0 6px' }}
                >
                  {team.description}
                </Paragraph>
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
      <Text type="secondary" style={{ fontSize: 12 }}>
        标准工作流（{expert.workflowSteps.length} 步）
      </Text>
      <Steps
        current={expert.workflowSteps.length - 1}
        direction="vertical"
        items={expert.workflowSteps.map((step, i) => ({
          description: <span style={{ color: '#888', fontSize: 12 }}>{`第 ${i + 1} 步`}</span>,
          title: <span style={{ color: '#1f1f1f', fontSize: 13 }}>{step}</span>,
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
      extra={
        <Button
          disabled={isPlanned}
          icon={<MessageSquarePlus size={14} />}
          loading={loading}
          onClick={onChat}
          style={{ background: '#2563EB', borderColor: '#2563EB' }}
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
          <span>{expert.name}</span>
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
