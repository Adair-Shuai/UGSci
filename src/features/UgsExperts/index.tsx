// UGS-MODIFY: UGS-015 储气库专家市场页 - 主页面（专家 + 专家团 Tab 合并）
import { BUILTIN_AGENTS, getAgentRuntimeConfig, type RuntimeContext } from '@lobechat/builtin-agents';
import { Button } from '@lobehub/ui';
import { Store } from 'lucide-react';
import { App, Tabs } from 'antd';
import { type FC, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import PageHeader from '@/features/UgsShared/PageHeader';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { chatGroupService } from '@/services/chatGroup';
import { type GroupMemberConfig, type SupervisorConfig } from '@/services/chatGroup';
import { useAgentStore } from '@/store/agent';

import ExpertCard from './ExpertCard';
import TeamCard from './TeamCard';
import {
  type ExpertCategory,
  type ExpertMeta,
  CATEGORY_LABELS,
  UGS_EXPERTS,
  UGS_EXPERT_TEAMS,
} from './ugsExpertsData';

const CATEGORY_ORDER: ExpertCategory[] = [
  'evaluation',
  'operation',
  'mechanism',
  'engineering',
  'aux',
];

type TabKey = 'experts' | 'teams';

const UgsExpertsPage: FC = () => {
  const { t } = useTranslation('common');
  const navigate = useWorkspaceAwareNavigate();
  const { message } = App.useApp();
  const refreshBuiltinAgent = useAgentStore((s) => s.refreshBuiltinAgent);

  const [activeTab, setActiveTab] = useState<TabKey>('experts');
  const [loadingExpertSlug, setLoadingExpertSlug] = useState<string | null>(null);
  const [loadingTeamId, setLoadingTeamId] = useState<string | null>(null);

  // 按分类分组
  const expertsByCategory = useMemo(() => {
    const map = new Map<ExpertCategory, ExpertMeta[]>();
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, UGS_EXPERTS.filter((e) => e.category === cat));
    }
    return map;
  }, []);

  // 点击专家卡片：refreshBuiltinAgent → navigate
  const handleExpertClick = useCallback(
    async (expert: ExpertMeta) => {
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

  // 点击专家团卡片：createGroupWithMembers → navigate
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

  // 跳转到 Lobe 原生专家市场（/community）
  const handleOpenMarket = useCallback(() => {
    navigate('/community');
  }, [navigate]);

  // 专家 Tab 内容
  const expertsContent = (
    <div>
      {CATEGORY_ORDER.map((cat) => {
        const experts = expertsByCategory.get(cat) ?? [];
        if (experts.length === 0) return null;
        return (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div
              style={{
                color: '#185FA5',
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 8,
                paddingBottom: 4,
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              {CATEGORY_LABELS[cat]}（{experts.length}）
            </div>
            <div
              style={{
                display: 'grid',
                gap: 12,
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              }}
            >
              {experts.map((expert) => (
                <ExpertCard
                  expert={expert}
                  key={expert.slug}
                  loading={loadingExpertSlug === expert.slug}
                  onClick={() => handleExpertClick(expert)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // 专家团 Tab 内容
  const teamsContent = (
    <div>
      <p style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>
        专家团由团长（Supervisor）自动拆解任务并调度子专家，你只需跟团长对话
      </p>
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        }}
      >
        {UGS_EXPERT_TEAMS.map((team) => (
          <TeamCard
            key={team.teamId}
            loading={loadingTeamId === team.teamId}
            onSummon={() => handleTeamSummon(team)}
            team={team}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        description="13 位储气库领域专家 + 5 个预置专家团，点击召唤即进入专属对话"
        emoji="🛢️"
        extra={
          <Button
            icon={<Store size={16} />}
            onClick={handleOpenMarket}
            size="small"
          >
            专家市场
          </Button>
        }
        title="UGSci 专家"
      />

      <Tabs
        activeKey={activeTab}
        items={[
          { children: expertsContent, key: 'experts', label: `专家（${UGS_EXPERTS.length}）` },
          { children: teamsContent, key: 'teams', label: `专家团（${UGS_EXPERT_TEAMS.length}）` },
        ]}
        onChange={(k) => setActiveTab(k as TabKey)}
      />
    </div>
  );
};

export default UgsExpertsPage;
