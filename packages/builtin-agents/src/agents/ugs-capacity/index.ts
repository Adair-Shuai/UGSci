// UGS-MODIFY: UGS-009 库容评估专家
import type { BuiltinAgentDefinition } from '../../types';
import { BUILTIN_AGENT_SLUGS } from '../../types';
import { createSystemRole } from './systemRole';

export const UGS_CAPACITY: BuiltinAgentDefinition = {
  avatar: '📊',
  runtime: (ctx) => ({
    systemRole: createSystemRole(ctx.userLocale),
  }),
  slug: BUILTIN_AGENT_SLUGS.ugsCapacity,
};
