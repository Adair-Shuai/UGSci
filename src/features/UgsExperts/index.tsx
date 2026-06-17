// UGS-MODIFY: UGS-015 储气库专家市场页 - 主页面
import { BUILTIN_AGENTS, getAgentRuntimeConfig, type RuntimeContext } from '@lobechat/builtin-agents';
import { PageHeader } from '@/features/UgsShared';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { chatGroupService } from '@/services/chatGroup';
import { type GroupMemberConfig, type SupervisorConfig } from '@/services/chatGroup';
import { useAgentStore } from '@/store/agent';
import { App } from 'antd';
import { type FC, useCallback, useMemo, useState } from 'react';

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

const UgsExpertsPage: FC = () => {
  const navigate = useWorkspaceAwareNavigate();
  const { message } = App.useApp();
  const refreshBuiltinAgent = useAgentStore((s) => s.refreshBuiltinAgent);

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

  // 点击专家卡片：ensureBuiltinAgentHydrated → navigate
  const handleExpertClick = useCallback(
    async (expert: ExpertMeta) => {
      setLoadingExpertSlug(expert.slug);
      try {
        // 调 refreshBuiltinAgent 触发服务端 getBuiltinAgent（按 slug 查/建 agent 记录）
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
        // 从 BUILTIN_AGENTS 读取每个成员的 runtime config 生成 systemRole
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
            // config.systemPrompt 是团长的备用 systemRole
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

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        description="13 位储气库领域专家 + 5 个预置专家团，点击召唤即进入专属对话"
        emoji="🛢️"
        title="UGSci 储气库专家市场"
      />

      {/* 专家区 */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1f1f1f', marginBottom: 12 }}>
          单专家
        </h2>
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

      {/* 专家团区 */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1f1f1f', marginBottom: 12 }}>
          预置专家团
        </h2>
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
    </div>
  );
};

export default UgsExpertsPage;
