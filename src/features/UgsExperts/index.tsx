// UGS-MODIFY: UGS-015 储气库专家广场页 - 主页面（专家广场模式 + Drawer 详情）
// 一级页面：4 列 Grid Card，分类筛选 + 搜索，点击卡片打开 Drawer
// 业务模型：Expert = Persona + Skills + Tools + Workflows + Team Relations
// 仅展示层重构，复用 agentStore / toolStore，不修改编辑器与数据结构。
// 视觉对齐 UgsCapabilities：createStaticStyles + cssVar（深浅色自动适配）+ 独立滚动容器
//
// 右上角三模块（与能力中心/技能中心视觉对齐）：
// - 搜索框：本地筛选专家
// - 专家市场：navigate('/community') 复用 Lobe 社区助理商店
// - 自定义专家：useAgentStore.createAgent({}) + navigate，复用 Lobe 自定义助理逻辑
//
// 操作闭环：
// - 从市场添加助理或自定义创建后，availableAgents 变化 → mergeExpertsAndUserAgents
//   合并到专家列表 → 自动新增卡片
import { BUILTIN_AGENTS, getAgentRuntimeConfig, type RuntimeContext } from '@lobechat/builtin-agents';
import { Button } from '@lobehub/ui/base-ui';
import { Alert, App, Empty, Input, Tabs } from 'antd';
import { createStaticStyles } from 'antd-style';
import { Plus, Search, Store } from 'lucide-react';
import { type FC, useCallback, useMemo, useState } from 'react';

import { createUgsMarketModal } from '@/features/UgsMarket';
import PageHeader from '@/features/UgsShared/PageHeader';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { chatGroupService } from '@/services/chatGroup';
import { type GroupMemberConfig, type SupervisorConfig } from '@/services/chatGroup';
import { useAgentStore } from '@/store/agent';

import ExpertCard from './ExpertCard';
import ExpertDrawer from './ExpertDrawer';
import {
  filterExpertsByKeyword,
  mergeExpertsAndUserAgents,
  selectCategoryCounts,
  selectExpertCardMeta,
  selectExpertsByCategory,
  selectExpertStats,
} from './expertSelectors';
import TeamCard from './TeamCard';
import {
  EXPERT_CATEGORIES,
  EXPERT_CATEGORY_ORDER,
  type ExpertCategory,
  type ExpertMeta,
  UGS_EXPERT_TEAMS,
  UGS_EXPERTS,
} from './ugsExpertsData';

type CategoryFilter = ExpertCategory | 'all';
type TabKey = 'experts' | 'teams';

const styles = createStaticStyles(({ css, cssVar }) => ({
  // 外层独立滚动容器：解决 1) 底部内容裁剪 2) 切换分类时主滚动条出现/消失造成的宽度抖动
  scrollContainer: css`
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;

    /* 滚动条样式与 LobeHub 主题统一 */
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background: ${cssVar.colorFillSecondary};
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb:hover {
      background: ${cssVar.colorFill};
    }
  `,
  page: css`
    padding: 24px 32px;
    max-width: 1400px;
    margin: 0 auto;
  `,
  // 顶部工具栏（搜索 + 市场 + 自定义）
  toolbar: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  searchInput: css`
    max-width: 280px;

    .ant-input-affix-wrapper {
      background: ${cssVar.colorBgContainer};
      border-color: ${cssVar.colorBorderSecondary};
    }
  `,
  // 统计卡（对齐能力中心 statCard）
  statsGrid: css`
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
  `,
  statCard: css`
    flex: 1;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: ${cssVar.borderRadiusLG};
    background: ${cssVar.colorBgContainer};
    padding: 12px 16px;
  `,
  statLabel: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 11px;
  `,
  statValue: css`
    color: ${cssVar.colorPrimary};
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  `,
  statSub: css`
    color: ${cssVar.colorTextQuaternary};
    font-size: 11px;
  `,
  // 卡片 Grid：固定 minmax 避免分类切换时列数变化造成宽度抖动
  grid: css`
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  `,
  teamHint: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 12px;
    margin-bottom: 16px;
  `,
}));

const UgsExpertsPage: FC = () => {
  const navigate = useWorkspaceAwareNavigate();
  const { message } = App.useApp();
  const refreshBuiltinAgent = useAgentStore((s) => s.refreshBuiltinAgent);
  const createAgent = useAgentStore((s) => s.createAgent);
  const useFetchAvailableAgents = useAgentStore((s) => s.useFetchAvailableAgents);
  const availableAgents = useAgentStore((s) => s.availableAgents);

  // 拉取用户自建助理列表（SWR 缓存，createAgent 后会 invalidate 触发刷新）
  const { isLoading: agentsLoading, error: agentsError } = useFetchAvailableAgents(true);

  const [activeTab, setActiveTab] = useState<TabKey>('experts');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [keyword, setKeyword] = useState('');

  // Drawer 状态
  const [activeExpert, setActiveExpert] = useState<ExpertMeta | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingExpertSlug, setLoadingExpertSlug] = useState<string | null>(null);
  const [loadingTeamId, setLoadingTeamId] = useState<string | null>(null);
  const [creatingAgent, setCreatingAgent] = useState(false);

  // 合并 UGS 预置专家 + 用户自建助理（实现"添加后自动新增卡片"闭环）
  const allExperts = useMemo(
    () => mergeExpertsAndUserAgents(UGS_EXPERTS, availableAgents),
    [availableAgents],
  );

  // 统计概览
  const stats = useMemo(() => selectExpertStats(allExperts), [allExperts]);
  const categoryCounts = useMemo(() => selectCategoryCounts(allExperts), [allExperts]);

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
    const byCat = selectExpertsByCategory(allExperts, activeCategory);
    return filterExpertsByKeyword(byCat, keyword);
  }, [activeCategory, keyword, allExperts]);

  // 点击卡片：打开 Drawer
  const handleOpenDetail = useCallback((expert: ExpertMeta) => {
    setActiveExpert(expert);
    setDrawerOpen(true);
  }, []);

  // 进入对话：
  // - 预置专家（isCustom != true）：refreshBuiltinAgent → navigate（复用现有逻辑）
  // - 用户自建助理（isCustom === true）：直接 navigate('/agent/:id')（agentId 即 slug）
  const handleChat = useCallback(
    async (expert: ExpertMeta) => {
      if (expert.planned) return;

      // 用户自建助理：slug 就是 agentId，直接跳转
      if (expert.isCustom) {
        navigate(`/agent/${expert.slug}`);
        return;
      }

      // 预置专家：refreshBuiltinAgent → navigate
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

  // 专家市场：弹窗形式（复用 Lobe 社区助理商店组件 + 分类筛选）
  const handleOpenMarket = useCallback(() => {
    createUgsMarketModal('agent', '专家市场');
  }, []);

  // 自定义专家：复用 Lobe createAgent，创建后自动出现在专家广场（availableAgents 刷新）
  const handleCreateCustomExpert = useCallback(async () => {
    setCreatingAgent(true);
    try {
      const result = await createAgent({});
      if (result?.agentId) {
        message.success('自定义专家已创建，正在进入编辑...');
        navigate(`/agent/${result.agentId}`);
      } else {
        message.error('创建失败');
      }
    } catch (err) {
      console.error('[UgsExperts] create custom expert failed:', err);
      message.error('创建失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setCreatingAgent(false);
    }
  }, [createAgent, navigate, message]);

  // 统计卡片
  const statCards = (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>专家总数</div>
        <div className={styles.statValue}>{stats.totalCount}</div>
        <div className={styles.statSub}>{stats.onlineCount} 已上线</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>技能总数</div>
        <div className={styles.statValue}>{stats.skillTotal}</div>
        <div className={styles.statSub}>跨 {stats.categoryCount} 个专业领域</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>关联工具</div>
        <div className={styles.statValue}>{stats.toolTotal}</div>
        <div className={styles.statSub}>来自能力中心</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>预置专家团</div>
        <div className={styles.statValue}>{stats.teamCount}</div>
        <div className={styles.statSub}>
          {stats.plannedCount > 0 ? `${stats.plannedCount} 个专家规划中` : '点击召唤即用'}
        </div>
      </div>
    </div>
  );

  // 右上角三模块：搜索框 + 专家市场 + 自定义专家
  const headerExtra = (
    <div className={styles.toolbar}>
      <Input
        allowClear
        className={styles.searchInput}
        placeholder="搜索专家"
        prefix={<Search size={14} />}
        size="middle"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      {/* 专家市场：navigate 到 Lobe 社区助理商店（/community） */}
      <Button icon={<Store size={16} />} type="primary" onClick={handleOpenMarket}>
        专家市场
      </Button>
      {/* 自定义专家：复用 Lobe createAgent，创建后自动出现在专家广场 */}
      <Button
        icon={<Plus size={16} />}
        loading={creatingAgent}
        onClick={handleCreateCustomExpert}
      >
        自定义专家
      </Button>
    </div>
  );

  // 专家广场内容
  const expertsContent = (
    <div>
      {/* 分类筛选 */}
      <Tabs
        activeKey={activeCategory}
        items={categoryTabItems}
        size="small"
        style={{ marginBottom: 12 }}
        onChange={(k) => setActiveCategory(k as CategoryFilter)}
      />

      {/* 专家卡片 Grid（auto-fill + minmax 保证列数稳定，宽度不抖动） */}
      {visibleExperts.length === 0 ? (
        <Empty
          description="未找到匹配的专家"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 48 }}
        />
      ) : (
        <div className={styles.grid}>
          {visibleExperts.map((expert) => {
            const cardMeta = selectExpertCardMeta(expert);
            return (
              <ExpertCard
                cardMeta={cardMeta}
                expert={expert}
                key={expert.slug}
                loading={loadingExpertSlug === expert.slug}
                onChat={() => handleChat(expert)}
                onOpenDetail={() => handleOpenDetail(expert)}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  // 专家团内容
  const teamsContent = (
    <div>
      <p className={styles.teamHint}>
        专家团由团长（Supervisor）自动拆解任务并调度子专家，你只需跟团长对话
      </p>
      <div className={styles.grid}>
        {UGS_EXPERT_TEAMS.map((team) => (
          <TeamCard
            key={team.teamId}
            loading={loadingTeamId === team.teamId}
            team={team}
            onSummon={() => handleTeamSummon(team)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.scrollContainer}>
      <div className={styles.page}>
        <PageHeader
          description="储气库领域专家广场 · 卡片式市场，点击卡片查看详情，一键进入专属对话"
          emoji="🛢️"
          extra={headerExtra}
          title="UGSci 专家广场"
        />

        {statCards}

        {/* 用户自建助理数据加载状态 */}
        {agentsError && (
          <Alert
            showIcon
            description="用户自建助理列表获取失败，请检查网络连接或稍后刷新。预置专家仍可正常使用。"
            message="部分数据加载失败"
            style={{ marginBottom: 16 }}
            type="warning"
          />
        )}

        <Tabs
          activeKey={activeTab}
          items={[
            { children: expertsContent, key: 'experts', label: `专家（${allExperts.length}）` },
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
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onChat={() => {
            if (activeExpert) {
              setDrawerOpen(false);
              handleChat(activeExpert);
            }
          }}
        />
      </div>
    </div>
  );
};

export default UgsExpertsPage;
