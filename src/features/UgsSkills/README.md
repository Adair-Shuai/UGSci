# UGS 技能中心（常用技能页）

> 路径：`http://localhost:9878/ugs-skills`
> 实现位置：`src/features/UgsSkills/`（4 个文件，约 250 行代码）
> 核心原则：**充分复用 Lobe 已有成熟模块，避免从零重写**

## 一、设计目标

将 `/ugs-skills` 页面重构为 WorkBuddy 风格的「常用技能」页面：
- 主体展示油气与储气库场景精选的常用 Lobe skill（非 MCP）
- 右上角三模块：搜索框 + 技能市场入口按钮 + 添加技能按钮
- 点击「技能市场」按钮 → 弹窗复用 Lobe 原生技能市场（三 Tab + 搜索 + AddSkill）
- 常用技能清单可动态配置，不硬编码

## 二、文件目录结构

```
src/features/UgsSkills/
├── index.tsx              # 主页面：PageHeader + 右上角三模块 + 分组常用技能网格
├── ugsCommonSkills.ts     # 常用技能配置（动态可扩展，后续增删只改这里）
├── AddSkillButton.tsx     # 添加技能按钮（复用 Lobe 4 个子弹窗）
└── README.md              # 本文档
```

## 三、Lobe 模块复用关系

| 需求 | 复用的 Lobe 模块 | 路径 |
|------|-----------------|------|
| 技能卡片模板 | `BuiltinItem` | `src/features/SkillStore/SkillList/Builtin/Item.tsx` |
| 技能市场弹窗 | `createSkillStoreModal()` | `src/features/SkillStore/index.tsx` |
| 技能详情弹窗 | `createBuiltinSkillDetailModal` / `createBuiltinAgentSkillDetailModal` | `src/features/SkillStore/SkillDetail/index.tsx` |
| 添加技能弹窗 | `ImportFromUrlModal` / `ImportFromGithubModal` / `UploadSkillModal` / `CustomConnectorModal` | `src/features/SkillStore/SkillList/` |
| 数据来源 | `useToolStore` 的 `builtinTools` + `builtinSkills` | `src/store/tool/` |
| 安装/卸载 | `installBuiltinTool` / `uninstallBuiltinTool`（BuiltinItem 内部自包含） | `src/store/tool/slices/builtin/` |

## 四、常用技能配置（动态可扩展）

`ugsCommonSkills.ts` 导出 `UGS_COMMON_SKILLS` 数组，每项含：

```ts
interface UgsCommonSkillEntry {
  identifier: string;           // Lobe builtin tool/skill 的 identifier（必填）
  group?: 'general' | 'oil-gas' | 'productivity';  // 分组
  customTitle?: string;         // 覆盖 i18n 默认标题
  customDescription?: string;   // 覆盖 i18n 默认描述
}
```

**后续增删常用技能只需改这个数组**，无需改组件代码。不存在的 identifier 会被静默忽略。

## 五、页面结构

```
┌─────────────────────────────────────────────────────┐
│ ✨ 常用技能                            [搜索] [市场] [+]│
│ UGSci 常用技能 · 油气与储气库场景精选...              │
├─────────────────────────────────────────────────────┤
│ ▍油气专业（0）                                       │
│   （暂无，待 Lobe 新增油气 builtin）                  │
├─────────────────────────────────────────────────────┤
│ ▍通用工具（6）                                       │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│   │📄 文档   │ │🧠 记忆   │ │✅ 任务   │               │
│   │解析生成  │ │记住偏好  │ │跟踪任务  │               │
│   │    [+]  │ │    [⋮]  │ │    [+]  │               │
│   └─────────┘ └─────────┘ └─────────┘               │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│   │💻 沙箱   │ │🎨 Art.. │ │💬 消息   │               │
│   │运行代码  │ │生成交互  │ │富文本    │               │
│   └─────────┘ └─────────┘ └─────────┘               │
└─────────────────────────────────────────────────────┘
```

## 六、关键交互

- **搜索**：右上角搜索框按 identifier / customTitle / customDescription 过滤常用技能
- **技能市场**：点击右上角「技能市场」按钮 → `createSkillStoreModal()` 弹出 Lobe 原生市场（含 LobeHub/Skills/MCP 三 Tab + 搜索 + AddSkillButton）
- **添加技能**：点击右上角「+」按钮 → 下拉 4 项（URL/GitHub/zip/自定义 MCP），复用 Lobe 原生弹窗
- **卡片安装**：BuiltinItem 内部自包含 `installBuiltinTool` / `uninstallBuiltinTool`，无需外部回调
- **卡片详情**：点击卡片主体 → 根据 identifier 判断是 tool 还是 skill → 调 `createBuiltinSkillDetailModal` 或 `createBuiltinAgentSkillDetailModal`

## 七、与 LobeChat 的兼容

- **0 后端改动，0 数据库改动**
- 安装/卸载完全复用 LobeChat 原生 action
- 数据来源仅限 Lobe builtin tools + builtin skills（不含 MCP，MCP 在技能市场弹窗里）
- 路由 `/ugs-skills` 未修改，侧边栏菜单未修改
