// UGS-MODIFY: UGS-015 储气库专家广场页 - 主页面（专家广场模式 + Drawer 详情）
// 一级页面：4 列 Grid Card，分类筛选 + 搜索，点击卡片打开 Drawer
// 业务模型：Expert = Persona + Skills + Tools + Workflows + Team Relations
// 仅展示层重构，复用 agentStore / toolStore，不修改编辑器与数据结构。
import { BUILTIN_AGENTS, getAgentRuntimeConfig, type RuntimeContext } from '@lobechat/builtin-agents';
import { Button } from '@lobehub/ui';
import { Search, Store } from 'lucide-react';
import { App, Card, Col, Empty, Input, Row, Tabs } from 'antd';
import { type FC, useCallback, useMemo, useState } from 'react';

import PageHeader from '@/features/UgsShared/PageHeader';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { chatGroupService } from '@/services/chatGroup';
import { type GroupMemberConfig, type SupervisorConfig } from '@/services/chatGroup';
import { useAgentStore } from '@/store/agent';

import ExpertCard from './ExpertCard';
import ExpertDrawer from './ExpertDrawer';
import TeamCard from './TeamCard';
import {
  filterExpertsByKeyword,
  selectCategoryCounts,
  selectExpertCardMeta,
  selectExpertStats,
  selectExpertsByCategory,
} from './expertSelectors';
import {
  type ExpertCategory,
  type ExpertMeta,
  EXPERT_CATEGORIES,
  EXPERT_CATEGORY_ORDER,
  UGS_EXPERTS,
  UGS_EXPERT_TEAMS,
} from './ugsExpertsData';

type CategoryFilter = ExpertCategory | 'all';
type TabKey = 'experts' | 'teams';

const UgsExpertsPage: FC = () => {
  const navigate = useWorkspaceAwareNavigate();
  const { message } = App.useApp();
  const refreshBuiltinAgent = useAgentStore((s) => s.refreshBuiltinAgent);

  const [activeTab, setActiveTab] = useState<TabKey>('experts');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [keyword, setKeyword] = useState('');

  // Drawer 状态
  const [activeExpert, setActiveExpert] = useState<ExpertMeta | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingExpertSlug, setLoadingExpertSlug] = useState<string | null>(null);
  const [loadingTeamId, setLoadingTeamId] = useState<string | null>(null);

  // 统计概览
  const stats = useMemo(() => selectExpertStats(UGS_EXPERTS), []);
  const categoryCounts = useMemo(() => selectCategoryCounts(UGS_EXPERTS), []);

  // 分类 Tabs
  const categoryTabItems = useMemo(() => {
    const items = [{ key: 'all', label: `全部（${categoryCounts.all}）` }];
    for (const cat of EXPERT_CATEGORY_ORDER) {
      const meta = EXPERT_CATEGORIES[cat];
      items.push({
        key: cat,
        label: `${meta.icon} ${meta.label}（${categoryCounts[cat]}）`,
      });
    }
    return items;
  }, [categoryCounts]);

  // 当前展示的专家（分类 + 搜索）
  const visibleExperts = useMemo(() => {
    const byCat = selectExpertsByCategory(UGS_EXPERTS, activeCategory);
    return filterExpertsByKeyword(byCat, keyword);
  }, [activeCategory, keyword]);

  // 点击卡片：打开 Drawer
  const handleOpenDetail = useCallback((expert: ExpertMeta) => {
    setActiveExpert(expert);
    setDrawerOpen(true);
  }, []);

  // 进入对话：refreshBuiltinAgent → navigate（复用现有逻辑）
  const handleChat = useCallback(
    async (expert: ExpertMeta) => {
      if (expert.planned) return;
      setLoadingExpertSlug(expert.slug);
      try {
        await refreshBuiltinAgent(expert.slug);
        const agentId = useAgentStore.getState().builtinAgentIdMap[expert.slug];
        if (agentId) {
          navigate(`/agent/${agentId}`);
        } else {
          message.error('专家初始化失败，请稍后重试');
        }
      } catch (err) {
        console.error('[UgsExperts] init expert failed:', err);
        message.error('专家初始化失败：' + (err instanceof Error ? err.message : '未知错误'));
      } finally {
        setLoadingExpertSlug(null);
      }
    },
    [navigate, refreshBuiltinAgent, message],
  );

  // 召唤专家团：复用现有逻辑
  const handleTeamSummon = useCallback(
    async (team: (typeof UGS_EXPERT_TEAMS)[number]) => {
      setLoadingTeamId(team.teamId);
      try {
        const ctx: RuntimeContext = { userLocale: 'zh-CN' };
        const members: GroupMemberConfig[] = team.memberSlugs.map((slug) => {
          const runtimeResult = getAgentRuntimeConfig(slug, ctx);
          const agentDef = BUILTIN_AGENTS[slug as keyof typeof BUILTIN_AGENTS];
          return {
            avatar: agentDef?.avatar,
            systemRole: runtimeResult?.systemRole ?? '',
            title: UGS_EXPERTS.find((e) => e.slug === slug)?.name ?? slug,
          };
        });

        const supervisorConfig: SupervisorConfig = {
          avatar: '👥',
          systemRole: team.supervisorSystemRole,
          title: team.name + '·团长',
        };

        message.loading({ content: '正在组建专家团...', key: 'team-create', duration: 0 });

        const result = await chatGroupService.createGroupWithMembers(
          {
            title: team.name,
            config: { systemPrompt: team.supervisorSystemRole } as any,
          },
          members,
          supervisorConfig,
        );

        message.destroy('team-create');

        if (result?.groupId) {
          message.success(`「${team.name}」已就绪，正在进入...`);
          navigate(`/group/${result.groupId}`);
        } else {
          message.error('专家团创建失败');
        }
      } catch (err) {
        message.destroy('team-create');
        console.error('[UgsExperts] create team failed:', err);
        message.error('专家团创建失败：' + (err instanceof Error ? err.message : '未知错误'));
      } finally {
        setLoadingTeamId(null);
      }
    },
    [navigate, message],
  );

  const handleOpenMarket = useCallback(() => {
    navigate('/community');
  }, [navigate]);

  // 统计卡片
  const statCards = (
    <Row gutter={16} style={{ marginBottom: 20 }}>
      <Col span={6}>
        <Card size="small">
          <div style={{ color: '#888', fontSize: 11 }}>专家总数</div>
          <div style={{ color: '#185FA5', fontSize: 20, fontWeight: 600 }}>
            {stats.totalCount}
          </div>
          <div style={{ color: '#888', fontSize: 11 }}>{stats.onlineCount} 已上线</div>
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small">
          <div style={{ color: '#888', fontSize: 11 }}>技能总数</div>
          <div style={{ color: '#185FA5', fontSize: 20, fontWeight: 600 }}>{stats.skillTotal}</div>
          <div style={{ color: '#888', fontSize: 11 }}>跨 {stats.categoryCount} 个专业领域</div>
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small">
          <div style={{ color: '#888', fontSize: 11 }}>关联工具</div>
          <div style={{ color: '#185FA5', fontSize: 20, fontWeight: 600 }}>{stats.toolTotal}</div>
          <div style={{ color: '#888', fontSize: 11 }}>来自能力中心</div>
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small">
          <div style={{ color: '#888', fontSize: 11 }}>预置专家团</div>
          <div style={{ color: '#185FA5', fontSize: 20, fontWeight: 600 }}>{stats.teamCount}</div>
          <div style={{ color: '#888', fontSize: 11 }}>
            {stats.plannedCount > 0 ? `${stats.plannedCount} 个专家规划中` : '点击召唤即用'}
          </div>
        </Card>
      </Col>
    </Row>
  );

  // 专家广场内容
  const expertsContent = (
    <div>
      {/* 分类筛选 */}
      <Tabs
        activeKey={activeCategory}
        items={categoryTabItems}
        onChange={(k) => setActiveCategory(k as CategoryFilter)}
        size="small"
        style={{ marginBottom: 12 }}
      />

      {/* 搜索 */}
      <Input
        allowClear
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索专家名称 / 职称 / 技能 / 标签"
        prefix={<Search size={14} color="#bbb" />}
        size="middle"
        style={{ marginBottom: 16, maxWidth: 360 }}
        value={keyword}
      />

      {/* 4 列专家卡片 Grid */}
      {visibleExperts.length === 0 ? (
        <Empty
          description="未找到匹配的专家"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 48 }}
        />
      ) : (
        <Row gutter={[12, 12]}>
          {visibleExperts.map((expert) => {
            const cardMeta = selectExpertCardMeta(expert);
            return (
              <Col key={expert.slug} lg={6} md={8} sm={12} xs={24}>
                <ExpertCard
                  cardMeta={cardMeta}
                  expert={expert}
                  loading={loadingExpertSlug === expert.slug}
                  onChat={() => handleChat(expert)}
                  onOpenDetail={() => handleOpenDetail(expert)}
                />
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );

  // 专家团内容
  const teamsContent = (
    <div>
      <p style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>
        专家团由团长（Supervisor）自动拆解任务并调度子专家，你只需跟团长对话
      </p>
      <Row gutter={[16, 16]}>
        {UGS_EXPERT_TEAMS.map((team) => (
          <Col key={team.teamId} lg={6} md={8} sm={12} xs={24}>
            <TeamCard
              loading={loadingTeamId === team.teamId}
              onSummon={() => handleTeamSummon(team)}
              team={team}
            />
          </Col>
        ))}
      </Row>
    </div>
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        description="储气库领域专家广场 · 卡片式市场，点击卡片查看详情，一键进入专属对话"
        emoji="🛢️"
        extra={
          <Button icon={<Store size={16} />} onClick={handleOpenMarket} size="small">
            专家市场
          </Button>
        }
        title="UGSci 专家广场"
      />

      {statCards}

      <Tabs
        activeKey={activeTab}
        items={[
          { children: expertsContent, key: 'experts', label: `专家（${UGS_EXPERTS.length}）` },
          {
            children: teamsContent,
            key: 'teams',
            label: `专家团（${UGS_EXPERT_TEAMS.length}）`,
          },
        ]}
        onChange={(k) => setActiveTab(k as TabKey)}
      />

      {/* 专家详情 Drawer */}
      <ExpertDrawer
        expert={activeExpert}
        loading={activeExpert ? loadingExpertSlug === activeExpert.slug : false}
        onClose={() => setDrawerOpen(false)}
        onChat={() => {
          if (activeExpert) {
            setDrawerOpen(false);
            handleChat(activeExpert);
          }
        }}
        open={drawerOpen}
      />
    </div>
  );
};

export default UgsExpertsPage;
