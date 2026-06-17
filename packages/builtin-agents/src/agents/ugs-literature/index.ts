// UGS-MODIFY: UGS-009 文献与写作助手
import type { BuiltinAgentDefinition } from '../../types';
import { BUILTIN_AGENT_SLUGS } from '../../types';
import { createSystemRole } from './systemRole';

export const UGS_LITERATURE: BuiltinAgentDefinition = {
  avatar: '📚',
  runtime: (ctx) => ({
    systemRole: createSystemRole(ctx.userLocale),
  }),
  slug: BUILTIN_AGENT_SLUGS.ugsLiterature,
};
