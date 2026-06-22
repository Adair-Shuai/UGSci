// UGS-MODIFY: Local market data provider
// Serves LobeHub real skill provider data + builtin agents as market API responses
// when the remote market.lobehub.com is unreachable.
//
// Data sources (all from the LobeHub codebase):
// - LobeHub OAuth skills: packages/const/src/lobehubSkill.ts (6 providers: GitHub/Linear/Microsoft/Notion/Twitter/Vercel)
// - Builtin Agent Skills: packages/builtin-skills (4 items)
// - Builtin Agents: packages/builtin-agents (UGS 13 + LobeHub 12 visible)
// - Preset MCPs: NeqSim, pyResToolbox

import type {
  DiscoverAssistantItem,
  DiscoverMcpItem,
  DiscoverSkillItem,
} from '@/types/discover';

// ===== Skill Market Data =====
// Real LobeHub OAuth skill providers (from packages/const/src/lobehubSkill.ts)
// These are actual skills available on market.lobehub.com

const LOBEHUB_SKILLS: DiscoverSkillItem[] = [
  {
    category: 'developer-tools',
    createdAt: '2024-06-01T00:00:00Z',
    description: 'Connect to GitHub to access repositories, create issues, review PRs, and collaborate on code through AI conversation.',
    identifier: 'github',
    homepage: 'https://lobehub.com/skills/github',
    installCount: 0,
    isFeatured: true,
    isOfficial: true,
    isValidated: true,
    icon: '🐙',
    name: 'GitHub',
    tags: ['github', 'git', 'repository', 'issues', 'pull-requests', 'code-review'],
    updatedAt: '2024-06-01T00:00:00Z',
    version: '1.0.0',
    versionNumber: 1,
    versions: [],
  },
  {
    category: 'project-management',
    createdAt: '2024-07-01T00:00:00Z',
    description: 'Create and update issues, manage sprints, and track project progress in Linear through AI conversation.',
    identifier: 'linear',
    homepage: 'https://lobehub.com/skills/linear',
    installCount: 0,
    isFeatured: true,
    isOfficial: true,
    isValidated: true,
    icon: '📊',
    name: 'Linear',
    tags: ['linear', 'project-management', 'issues', 'sprints', 'agile'],
    updatedAt: '2024-07-01T00:00:00Z',
    version: '1.0.0',
    versionNumber: 1,
    versions: [],
  },
  {
    category: 'productivity',
    createdAt: '2024-08-01T00:00:00Z',
    description: 'View, create, and manage Outlook Calendar events — schedule meetings, check availability, set reminders through AI.',
    identifier: 'microsoft',
    homepage: 'https://lobehub.com/skills/outlook',
    installCount: 0,
    isFeatured: true,
    isOfficial: true,
    isValidated: true,
    icon: '📅',
    name: 'Outlook Calendar',
    tags: ['outlook', 'calendar', 'scheduling', 'meetings', 'productivity'],
    updatedAt: '2024-08-01T00:00:00Z',
    version: '1.0.0',
    versionNumber: 1,
    versions: [],
  },
  {
    category: 'productivity',
    createdAt: '2024-05-01T00:00:00Z',
    description: 'Access and manage Notion workspace — create pages, search content, update databases through AI conversation.',
    identifier: 'notion',
    homepage: 'https://lobehub.com/skills/notion',
    installCount: 0,
    isFeatured: true,
    isOfficial: true,
    isValidated: true,
    icon: '📝',
    name: 'Notion',
    tags: ['notion', 'notes', 'wiki', 'knowledge-base', 'productivity'],
    updatedAt: '2024-05-01T00:00:00Z',
    version: '1.0.0',
    versionNumber: 1,
    versions: [],
  },
  {
    category: 'social-media',
    createdAt: '2024-09-01T00:00:00Z',
    description: 'Post tweets, manage timeline, monitor mentions, and build social media presence through conversational AI.',
    identifier: 'twitter',
    homepage: 'https://lobehub.com/skills/twitter',
    installCount: 0,
    isFeatured: true,
    isOfficial: true,
    isValidated: true,
    icon: '🐦',
    name: 'X (Twitter)',
    tags: ['twitter', 'social-media', 'posting', 'engagement'],
    updatedAt: '2024-09-01T00:00:00Z',
    version: '1.0.0',
    versionNumber: 1,
    versions: [],
  },
  {
    category: 'developer-tools',
    createdAt: '2024-10-01T00:00:00Z',
    description: 'Manage Vercel deployments, monitor project status, control infrastructure through conversational AI.',
    identifier: 'vercel',
    homepage: 'https://lobehub.com/skills/vercel',
    installCount: 0,
    isFeatured: true,
    isOfficial: true,
    isValidated: true,
    icon: '▲',
    name: 'Vercel',
    tags: ['vercel', 'deployment', 'hosting', 'serverless', 'cloud'],
    updatedAt: '2024-10-01T00:00:00Z',
    version: '1.0.0',
    versionNumber: 1,
    versions: [],
  },
];

// Builtin Agent Skills (from packages/builtin-skills)
const BUILTIN_SKILLS: DiscoverSkillItem[] = [
  {
    category: 'developer-tools',
    createdAt: '2025-01-01T00:00:00Z',
    description: '浏览器自动化 CLI，用于 AI Agent 执行网页操作、截图、抓取等任务',
    identifier: 'lobe-agent-browser',
    installCount: 0,
    isFeatured: false,
    isOfficial: true,
    isValidated: true,
    icon: '🌐',
    name: 'Agent Browser',
    tags: ['browser', 'automation', 'agent'],
    updatedAt: '2025-01-01T00:00:00Z',
    version: '1.0.0',
    versionNumber: 1,
    versions: [],
  },
  {
    category: 'developer-tools',
    createdAt: '2025-01-01T00:00:00Z',
    description: '生成可视化与交互产物（SVG、HTML、React 组件），支持图表、表单、仪表盘等',
    identifier: 'lobe-artifacts',
    installCount: 0,
    isFeatured: false,
    isOfficial: true,
    isValidated: true,
    icon: '🎨',
    name: 'Artifacts',
    tags: ['visualization', 'svg', 'html', 'react'],
    updatedAt: '2025-01-01T00:00:00Z',
    version: '1.0.0',
    versionNumber: 1,
    versions: [],
  },
  {
    category: 'productivity',
    createdAt: '2025-01-01T00:00:00Z',
    description: '管理 UGSci 平台（修改配置、切换模型、Bot 集成等）',
    identifier: 'ugsc',
    installCount: 0,
    isFeatured: false,
    isOfficial: true,
    isValidated: true,
    icon: '⚡',
    name: 'UGSci',
    tags: ['platform', 'ugsc', 'management'],
    updatedAt: '2025-01-01T00:00:00Z',
    version: '1.0.0',
    versionNumber: 1,
    versions: [],
  },
  {
    category: 'productivity',
    createdAt: '2025-01-01T00:00:00Z',
    description: '任务管理与执行引擎，支持分解复杂任务、跟踪进度、自动执行子任务',
    identifier: 'task',
    installCount: 0,
    isFeatured: true,
    isOfficial: true,
    isValidated: true,
    icon: '📋',
    name: 'Task',
    tags: ['task', 'automation', 'workflow'],
    updatedAt: '2025-01-01T00:00:00Z',
    version: '1.0.0',
    versionNumber: 1,
    versions: [],
  },
];

const ALL_SKILLS = [...LOBEHUB_SKILLS, ...BUILTIN_SKILLS];

export function getLocalSkillList(): {
  items: DiscoverSkillItem[];
  categories: { category: string; count: number }[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
} {
  const catCounts = new Map<string, number>();
  for (const s of ALL_SKILLS) {
    const cat = s.category ?? 'other';
    catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
  }
  const categories = Array.from(catCounts.entries()).map(([category, count]) => ({ category, count }));

  return {
    categories,
    currentPage: 1,
    items: ALL_SKILLS,
    pageSize: 20,
    totalCount: ALL_SKILLS.length,
    totalPages: 1,
  };
}

export function getLocalSkillCategories() {
  const catCounts = new Map<string, number>();
  for (const s of ALL_SKILLS) {
    const cat = s.category ?? 'other';
    catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
  }
  return Array.from(catCounts.entries()).map(([category, count]) => ({ category, count }));
}

// ===== Assistant/Agent Market Data =====

const VISIBLE_LOBEHUB_AGENTS: DiscoverAssistantItem[] = [
  {
    author: 'LobeHub', category: 'general' as any, createdAt: '2024-01-01T00:00:00Z',
    description: '通用智能助手，支持多领域对话、知识问答、文档分析',
    homepage: '', identifier: 'inbox', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0,
    tags: ['general', 'chat'], title: 'UGS AI', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    author: 'LobeHub', category: 'productivity' as any, createdAt: '2024-01-01T00:00:00Z',
    description: '任务管理与执行助手，自动分解复杂任务并调度子代理',
    homepage: '', identifier: 'task-agent', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0,
    tags: ['task', 'automation'], title: 'Task Agent', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    author: 'LobeHub', category: 'productivity' as any, createdAt: '2024-01-01T00:00:00Z',
    description: '通过自然对话创建和定制 AI Agents，无需编写代码',
    homepage: '', identifier: 'agent-builder', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0,
    tags: ['agent-builder', 'no-code'], title: 'Agent Builder', updatedAt: '2024-01-01T00:00:00Z',
  },
];

const UGS_AGENTS: DiscoverAssistantItem[] = [
  { author: 'UGSci', category: 'science' as any, createdAt: '2025-06-01T00:00:00Z', description: '油气藏库容评估与损耗分析，基于 SY/T 7686-2023 标准', homepage: '', identifier: 'ugs-capacity', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0, tags: ['储气库', '库容评估', '损耗率'], title: '库容评估专家', updatedAt: '2025-06-01T00:00:00Z' },
  { author: 'UGSci', category: 'science' as any, createdAt: '2025-06-01T00:00:00Z', description: '储气库注采能力评价与产能预测', homepage: '', identifier: 'ugs-deliverability', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0, tags: ['产能', '注采', '预测'], title: '产能评估专家', updatedAt: '2025-06-01T00:00:00Z' },
  { author: 'UGSci', category: 'science' as any, createdAt: '2025-06-01T00:00:00Z', description: '储层物性参数分析与岩石物理建模', homepage: '', identifier: 'ugs-params', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0, tags: ['储层', '物性', '岩石物理'], title: '储层物性专家', updatedAt: '2025-06-01T00:00:00Z' },
  { author: 'UGSci', category: 'science' as any, createdAt: '2025-06-01T00:00:00Z', description: '储气库注采动态运行分析', homepage: '', identifier: 'ugs-injection', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0, tags: ['注采', '运行', '动态'], title: '注采运行专家', updatedAt: '2025-06-01T00:00:00Z' },
  { author: 'UGSci', category: 'science' as any, createdAt: '2025-06-01T00:00:00Z', description: '储气库调峰能力评估与优化', homepage: '', identifier: 'ugs-peaking', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0, tags: ['调峰', '优化', '管网'], title: '调峰能力专家', updatedAt: '2025-06-01T00:00:00Z' },
  { author: 'UGSci', category: 'science' as any, createdAt: '2025-06-01T00:00:00Z', description: '储气库配产配注方案优化', homepage: '', identifier: 'ugs-allocation', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0, tags: ['配产', '配注', '优化'], title: '配产配注专家', updatedAt: '2025-06-01T00:00:00Z' },
  { author: 'UGSci', category: 'science' as any, createdAt: '2025-06-01T00:00:00Z', description: '基于物理信息神经网络的储气库不确定性量化', homepage: '', identifier: 'ugs-bpinn', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0, tags: ['BPINN', '不确定性', '深度学习'], title: 'B-PINN 不确定性专家', updatedAt: '2025-06-01T00:00:00Z' },
  { author: 'UGSci', category: 'science' as any, createdAt: '2025-06-01T00:00:00Z', description: 'PVT 相态计算与流体物性分析', homepage: '', identifier: 'ugs-pvt', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0, tags: ['PVT', '相态', '流体'], title: 'PVT 相态专家', updatedAt: '2025-06-01T00:00:00Z' },
  { author: 'UGSci', category: 'science' as any, createdAt: '2025-06-01T00:00:00Z', description: '产量递减分析与试井解释（RTA/PTA）', homepage: '', identifier: 'ugs-rate-transient', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0, tags: ['RTA', '试井', '递减'], title: '产量递减/RTA 专家', updatedAt: '2025-06-01T00:00:00Z' },
  { author: 'UGSci', category: 'science' as any, createdAt: '2025-06-01T00:00:00Z', description: '测井数据处理与储层评价', homepage: '', identifier: 'ugs-logging', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0, tags: ['测井', '解释', '评价'], title: '测井解释专家', updatedAt: '2025-06-01T00:00:00Z' },
  { author: 'UGSci', category: 'science' as any, createdAt: '2025-06-01T00:00:00Z', description: '油气藏数值模拟（ECLIPSE/CMG/OPM）', homepage: '', identifier: 'ugs-simulation', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0, tags: ['数值模拟', 'CMG', 'ECLIPSE'], title: '数值模拟专家', updatedAt: '2025-06-01T00:00:00Z' },
  { author: 'UGSci', category: 'science' as any, createdAt: '2025-06-01T00:00:00Z', description: '井筒/盖层完整性评价与地质力学分析', homepage: '', identifier: 'ugs-integrity', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0, tags: ['完整性', '盖层', '力学'], title: '井筒完整性专家', updatedAt: '2025-06-01T00:00:00Z' },
  { author: 'UGSci', category: 'science' as any, createdAt: '2025-06-01T00:00:00Z', description: '储气库智能化文献检索与论文辅助写作', homepage: '', identifier: 'ugs-literature', installCount: 0, knowledgeCount: 0, pluginCount: 0, tokenUsage: 0, tags: ['文献', '论文', '写作'], title: '文献检索专家', updatedAt: '2025-06-01T00:00:00Z' },
];

export function getLocalAssistantList(): {
  items: DiscoverAssistantItem[];
  categories: { category: string; count: number }[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
} {
  const items = [...VISIBLE_LOBEHUB_AGENTS, ...UGS_AGENTS];
  return {
    categories: [
      { category: 'general', count: 1 },
      { category: 'productivity', count: 2 },
      { category: 'science', count: UGS_AGENTS.length },
    ],
    currentPage: 1, items, pageSize: 20, totalCount: items.length, totalPages: 1,
  };
}

export function getLocalAssistantDetail(identifier: string) {
  return [...VISIBLE_LOBEHUB_AGENTS, ...UGS_AGENTS].find((a) => a.identifier === identifier) ?? null;
}

export function getLocalAssistantCategories() {
  return [
    { category: 'general', count: 1 },
    { category: 'productivity', count: 2 },
    { category: 'science', count: UGS_AGENTS.length },
  ];
}

// ===== MCP Market Data =====

export function getLocalMcpList(): {
  items: DiscoverMcpItem[];
  categories: string[];
  currentPage: number; pageSize: number; totalCount: number; totalPages: number;
} {
  const items: DiscoverMcpItem[] = [
    {
      capabilities: { prompts: false, resources: false, tools: true },
      category: 'science-education', createdAt: '2025-06-01T00:00:00Z',
      description: 'NeqSim PVT 相态计算引擎 — 支持闪蒸、相包络线、压缩因子、黏度等热力学计算',
      identifier: 'neqsim-mcp-server', installCount: 0, isFeatured: true, isOfficial: false,
      name: 'NeqSim PVT Engine', tags: ['PVT', '相态', '热力学', 'NeqSim'], toolsCount: 15,
      updatedAt: '2025-06-01T00:00:00Z', version: '1.0.0',
    } as DiscoverMcpItem,
    {
      capabilities: { prompts: false, resources: false, tools: true },
      category: 'science-education', createdAt: '2025-06-01T00:00:00Z',
      description: 'pyResToolbox 油藏工程工具箱 — 物质平衡、产能方程、递减分析等常用计算',
      identifier: 'pyrestoolbox-mcp', installCount: 0, isFeatured: true, isOfficial: false,
      name: 'pyResToolbox', tags: ['油藏工程', '物质平衡', '产能', 'Python'], toolsCount: 8,
      updatedAt: '2025-06-01T00:00:00Z', version: '1.0.0',
    } as DiscoverMcpItem,
    {
      capabilities: { prompts: false, resources: true, tools: true },
      category: 'developer-tools', createdAt: '2024-06-01T00:00:00Z',
      description: 'Microsoft Playwright MCP — 浏览器自动化测试与网页交互',
      identifier: 'microsoft-playwright-mcp', installCount: 0, isFeatured: false, isOfficial: true,
      name: 'Playwright MCP', tags: ['browser', 'testing', 'automation', 'playwright'], toolsCount: 20,
      updatedAt: '2024-06-01T00:00:00Z', version: '1.0.0',
    } as DiscoverMcpItem,
  ];
  return { categories: ['science-education', 'developer-tools'], currentPage: 1, items, pageSize: 20, totalCount: items.length, totalPages: 1 };
}

export function getLocalMcpCategories() {
  return [{ category: 'science-education', count: 2 }, { category: 'developer-tools', count: 1 }];
}

export function getLocalMcpDetail(identifier: string) {
  const { items } = getLocalMcpList();
  return items.find((m) => m.identifier === identifier) ?? null;
}
