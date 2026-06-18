// UGS-MODIFY: UGS-017 技能中心 — 常用技能配置（动态可扩展）
//
// 设计原则：
// 1. 只配置 LobeChat 的 builtinSkills（Agent Skills），不包含 builtinTools 或 MCP
//    - builtinSkills（skills）：lobe-agent-browser / lobe-artifacts / lobehub / task
//    - builtinTools（tools）：lobe-cloud-sandbox / lobe-user-memory / ...  ← 不属于技能中心
//    - MCP（外部工具）：github / notion / neqsim / ...                    ← 不属于技能中心
// 2. 不硬编码标题/描述 —— 优先来自 LobeChat i18n 或 store 的 BuiltinSkill 对象
//    customTitle / customDescription 仅用于油气场景覆盖
// 3. 可动态增删 —— 后续要加/删常用技能，只需改这个数组
//
// LobeChat builtinSkills 完整清单（来自 packages/builtin-skills/src/index.ts）：
// | identifier            | name            | 说明                              |
// |-----------------------|-----------------|-----------------------------------|
// | lobe-agent-browser    | Agent Browser   | 浏览器自动化（导航/表单/截图/爬取） |
// | lobe-artifacts        | Artifacts       | 生成 SVG/HTML/React 交互式内容     |
// | lobehub               | LobeHub         | 平台管理（agent/topic/plugin/bot） |
// | task                  | Task            | 任务管理与执行（CLI）              |

/**
 * 常用技能条目
 */
export interface UgsCommonSkillEntry {
  /** 自定义描述（覆盖 BuiltinSkill.description，用于油气场景说明） */
  customDescription?: string;
  /** 自定义标题（覆盖 BuiltinSkill.name） */
  customTitle?: string;
  /** 分组（用于本地展示分组） */
  group?: 'general' | 'oil-gas' | 'productivity';
  /** LobeChat builtinSkill 的 identifier（必填，必须是 builtinSkills 中的 identifier） */
  identifier: string;
}

/**
 * UGS 常用技能清单
 *
 * 仅包含 LobeChat builtinSkills（Agent Skills），不包含 builtinTools 或 MCP。
 * 展示在 /ugs-skills 页面「常用技能」Tab。后续增删只需改这个数组。
 * 不存在的 identifier 会被静默忽略（不报错，不显示）。
 */
export const UGS_COMMON_SKILLS: UgsCommonSkillEntry[] = [
  // ===== 通用工具（储气库数据分析常用） =====
  {
    customDescription: '生成交互式 HTML 报告、SVG 图表与 React 组件，适用于储气库产能分析可视化',
    group: 'general',
    identifier: 'lobe-artifacts',
  },
  {
    customDescription: '任务管理与执行，跟踪储气库产能分析的多步骤任务（创建/追踪/审阅/完成）',
    group: 'general',
    identifier: 'task',
  },
  {
    customDescription: '浏览器自动化，用于爬取储气库行业资讯、自动填报表格、截图取证',
    group: 'general',
    identifier: 'lobe-agent-browser',
  },
  {
    customDescription: 'LobeHub 平台管理，配置 agent / 知识库 / 插件 / 消息平台集成',
    group: 'productivity',
    identifier: 'lobehub',
  },
  // ===== 油气专业（占位，待 Lobe 新增油气 builtinSkill 后填充） =====
  // { identifier: 'lobe-pvt-analysis', group: 'oil-gas', customDescription: 'PVT 相态分析' },
  // { identifier: 'lobe-reservoir-sim', group: 'oil-gas', customDescription: '储层数值仿真' },
];

/**
 * 分组展示顺序
 */
export const UGS_SKILL_GROUP_ORDER: Array<NonNullable<UgsCommonSkillEntry['group']>> = [
  'oil-gas',
  'general',
  'productivity',
];

/**
 * 分组标签
 */
export const UGS_SKILL_GROUP_LABELS: Record<NonNullable<UgsCommonSkillEntry['group']>, string> = {
  general: '通用技能',
  'oil-gas': '油气专业',
  productivity: '效率工具',
};
