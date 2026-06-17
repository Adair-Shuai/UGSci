// UGS-MODIFY: UGS-009 完整性评价专家
import type { BuiltinAgentDefinition } from '../../types';
import { BUILTIN_AGENT_SLUGS } from '../../types';
import { createSystemRole } from './systemRole';

export const UGS_INTEGRITY: BuiltinAgentDefinition = {
  avatar: '🛡️',
  runtime: (ctx) => ({
    systemRole: createSystemRole(ctx.userLocale),
  }),
  slug: BUILTIN_AGENT_SLUGS.ugsIntegrity,
};
