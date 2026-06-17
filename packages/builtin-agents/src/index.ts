import { AGENT_BUILDER } from './agents/agent-builder';
import { GROUP_AGENT_BUILDER } from './agents/group-agent-builder';
import { GROUP_SUPERVISOR } from './agents/group-supervisor';
import { INBOX } from './agents/inbox';
import { NIGHTLY_REVIEW } from './agents/nightly-review';
import { PAGE_AGENT } from './agents/page-agent';
import { SELF_FEEDBACK_INTENT } from './agents/self-feedback-intent';
import { SELF_REFLECTION } from './agents/self-reflection';
import { SKILL_MANAGEMENT } from './agents/skill-management';
import { TASK_AGENT } from './agents/task-agent';
import { VERIFY_AGENT } from './agents/verify-agent';
import { WEB_ONBOARDING } from './agents/web-onboarding';
// UGS-MODIFY: UGS-009 储气库领域专家 agents
import { UGS_ALLOCATION } from './agents/ugs-allocation';
import { UGS_BPINN } from './agents/ugs-bpinn';
import { UGS_CAPACITY } from './agents/ugs-capacity';
import { UGS_DELIVERABILITY } from './agents/ugs-deliverability';
import { UGS_INJECTION } from './agents/ugs-injection';
import { UGS_INTEGRITY } from './agents/ugs-integrity';
import { UGS_LITERATURE } from './agents/ugs-literature';
import { UGS_LOGGING } from './agents/ugs-logging';
import { UGS_PARAMS } from './agents/ugs-params';
import { UGS_PEAKING } from './agents/ugs-peaking';
import { UGS_PVT } from './agents/ugs-pvt';
import { UGS_RATE_TRANSIENT } from './agents/ugs-rate-transient';
import { UGS_SIMULATION } from './agents/ugs-simulation';
import type { BuiltinAgentDefinition, BuiltinAgentSlug, RuntimeContext } from './types';
import { BUILTIN_AGENT_SLUGS } from './types';

export * from './types';

// Agent exports
export { AGENT_BUILDER } from './agents/agent-builder';
export { GROUP_AGENT_BUILDER } from './agents/group-agent-builder';
export { GROUP_SUPERVISOR } from './agents/group-supervisor';
export { INBOX } from './agents/inbox';
export { NIGHTLY_REVIEW } from './agents/nightly-review';
export { PAGE_AGENT } from './agents/page-agent';
export { SELF_FEEDBACK_INTENT } from './agents/self-feedback-intent';
export { SELF_REFLECTION } from './agents/self-reflection';
export { SKILL_MANAGEMENT } from './agents/skill-management';
export { TASK_AGENT } from './agents/task-agent';
export { VERIFY_AGENT } from './agents/verify-agent';
export { WEB_ONBOARDING } from './agents/web-onboarding';
// UGS-MODIFY: UGS-009 储气库专家 exports
export { UGS_ALLOCATION } from './agents/ugs-allocation';
export { UGS_BPINN } from './agents/ugs-bpinn';
export { UGS_CAPACITY } from './agents/ugs-capacity';
export { UGS_DELIVERABILITY } from './agents/ugs-deliverability';
export { UGS_INJECTION } from './agents/ugs-injection';
export { UGS_INTEGRITY } from './agents/ugs-integrity';
export { UGS_LITERATURE } from './agents/ugs-literature';
export { UGS_LOGGING } from './agents/ugs-logging';
export { UGS_PARAMS } from './agents/ugs-params';
export { UGS_PEAKING } from './agents/ugs-peaking';
export { UGS_PVT } from './agents/ugs-pvt';
export { UGS_RATE_TRANSIENT } from './agents/ugs-rate-transient';
export { UGS_SIMULATION } from './agents/ugs-simulation';

/**
 * All builtin agents indexed by slug
 */
export const BUILTIN_AGENTS: Record<BuiltinAgentSlug, BuiltinAgentDefinition> = {
  [BUILTIN_AGENT_SLUGS.agentBuilder]: AGENT_BUILDER,
  [BUILTIN_AGENT_SLUGS.groupAgentBuilder]: GROUP_AGENT_BUILDER,
  [BUILTIN_AGENT_SLUGS.groupSupervisor]: GROUP_SUPERVISOR,
  [BUILTIN_AGENT_SLUGS.inbox]: INBOX,
  [BUILTIN_AGENT_SLUGS.nightlyReview]: NIGHTLY_REVIEW,
  [BUILTIN_AGENT_SLUGS.pageAgent]: PAGE_AGENT,
  [BUILTIN_AGENT_SLUGS.selfFeedbackIntent]: SELF_FEEDBACK_INTENT,
  [BUILTIN_AGENT_SLUGS.selfReflection]: SELF_REFLECTION,
  [BUILTIN_AGENT_SLUGS.skillManagement]: SKILL_MANAGEMENT,
  [BUILTIN_AGENT_SLUGS.taskAgent]: TASK_AGENT,
  [BUILTIN_AGENT_SLUGS.verifyAgent]: VERIFY_AGENT,
  [BUILTIN_AGENT_SLUGS.webOnboarding]: WEB_ONBOARDING,
  // UGS-MODIFY: UGS-009 储气库领域专家
  [BUILTIN_AGENT_SLUGS.ugsCapacity]: UGS_CAPACITY,
  [BUILTIN_AGENT_SLUGS.ugsDeliverability]: UGS_DELIVERABILITY,
  [BUILTIN_AGENT_SLUGS.ugsParams]: UGS_PARAMS,
  [BUILTIN_AGENT_SLUGS.ugsInjection]: UGS_INJECTION,
  [BUILTIN_AGENT_SLUGS.ugsPeaking]: UGS_PEAKING,
  [BUILTIN_AGENT_SLUGS.ugsAllocation]: UGS_ALLOCATION,
  [BUILTIN_AGENT_SLUGS.ugsBpinn]: UGS_BPINN,
  [BUILTIN_AGENT_SLUGS.ugsPvt]: UGS_PVT,
  [BUILTIN_AGENT_SLUGS.ugsRateTransient]: UGS_RATE_TRANSIENT,
  [BUILTIN_AGENT_SLUGS.ugsLogging]: UGS_LOGGING,
  [BUILTIN_AGENT_SLUGS.ugsSimulation]: UGS_SIMULATION,
  [BUILTIN_AGENT_SLUGS.ugsIntegrity]: UGS_INTEGRITY,
  [BUILTIN_AGENT_SLUGS.ugsLiterature]: UGS_LITERATURE,
};

/**
 * Slugs that belong to the self-iteration family (nightly review, post-turn
 * reflection, and explicit feedback-intent handlers).
 * Used by AgentSignal to skip re-triggering signal events for builtin
 * background runs (suppressSignal behaviour) and by completion policies to
 * route post-execution side-effects.
 */
export const SELF_ITERATION_AGENT_SLUGS = new Set<BuiltinAgentSlug>([
  BUILTIN_AGENT_SLUGS.nightlyReview,
  BUILTIN_AGENT_SLUGS.selfFeedbackIntent,
  BUILTIN_AGENT_SLUGS.selfReflection,
  BUILTIN_AGENT_SLUGS.skillManagement,
]);

/**
 * Get persist config for a builtin agent (for DB operations)
 * @param slug - The builtin agent slug
 * @returns Persist config with slug or undefined if not found
 */
export const getAgentPersistConfig = (slug: string) => {
  const agent = BUILTIN_AGENTS[slug as BuiltinAgentSlug];
  if (!agent) return undefined;

  return { ...agent.persist, slug: agent.slug };
};

/**
 * Get runtime config for a builtin agent
 * @param slug - The builtin agent slug
 * @param ctx - Runtime context
 * @returns Runtime result or undefined if not found
 */
export const getAgentRuntimeConfig = (slug: string, ctx: RuntimeContext) => {
  const agent = BUILTIN_AGENTS[slug as BuiltinAgentSlug];
  if (!agent) return undefined;

  // Handle both function and plain object forms
  const runtime = agent.runtime;
  return typeof runtime === 'function' ? runtime(ctx) : runtime;
};
