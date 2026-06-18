// UGS-MODIFY: UGS-009 配产配注专家
import type { BuiltinAgentDefinition } from '../../types';
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '@lobechat/business-const';
import { BUILTIN_AGENT_SLUGS } from '../../types';
import { createSystemRole } from './systemRole';

export const UGS_ALLOCATION: BuiltinAgentDefinition = {
  avatar: '📐',
  // UGS-MODIFY: persist 默认模型配置（避免 getBuiltinAgent 创建无 model 的 agent 记录）
  persist: {
    model: DEFAULT_MODEL,
    provider: DEFAULT_PROVIDER,
    title: '配产配注专家',
  },
  runtime: (ctx) => ({
    systemRole: createSystemRole(ctx.userLocale),
  }),
  slug: BUILTIN_AGENT_SLUGS.ugsAllocation,
};
