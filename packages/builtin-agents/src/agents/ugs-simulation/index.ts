// UGS-MODIFY: UGS-009 数值模拟专家
import type { BuiltinAgentDefinition } from '../../types';
import { BUILTIN_AGENT_SLUGS } from '../../types';
import { createSystemRole } from './systemRole';

export const UGS_SIMULATION: BuiltinAgentDefinition = {
  avatar: '🖥️',
  runtime: (ctx) => ({
    systemRole: createSystemRole(ctx.userLocale),
  }),
  slug: BUILTIN_AGENT_SLUGS.ugsSimulation,
};
