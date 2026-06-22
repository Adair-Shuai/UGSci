import type { BuiltinSkill } from '@lobechat/types';

import { AgentBrowserSkill } from './agent-browser';
import { ArtifactsSkill } from './artifacts';
import { UGSciSkill } from './lobehub';
import { TaskSkill } from './task';

export { AgentBrowserIdentifier } from './agent-browser';
export { ArtifactsIdentifier } from './artifacts';
export { UGSciIdentifier } from './lobehub';
export { TaskIdentifier } from './task';

export const builtinSkills: BuiltinSkill[] = [
  AgentBrowserSkill,
  ArtifactsSkill,
  UGSciSkill,
  TaskSkill,
  // FindSkillsSkill
];
