// UGS-MODIFY: UGS-009 产量不稳定分析专家
import type { BuiltinAgentDefinition } from '../../types';
import { BUILTIN_AGENT_SLUGS } from '../../types';
import { createSystemRole } from './systemRole';

export const UGS_RATE_TRANSIENT: BuiltinAgentDefinition = {
  avatar: '📉',
  runtime: (ctx) => ({
    systemRole: createSystemRole(ctx.userLocale),
  }),
  slug: BUILTIN_AGENT_SLUGS.ugsRateTransient,
};
