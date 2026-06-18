# UGSci 未修复问题总清单

> 汇总日期：2026-06-18 18:52 | 来源：bug-tracker + 断链报告 + gstack 审查 + 故障清单

---

## 一、P0/P1 级别（阻塞上线）

| # | 来源 | 问题 | 状态 |
|---|------|------|------|
| #18 | 断链 | market.lobehub.com 不可达，所有市场 API 返回 500 | ✅ 已修复（37 个 market 端点 fallback 到空数据/NOT_FOUND） |
| #ERR-002 | bug-tracker | Market API 500 导致社区市场列表/详情页空白 | ✅ 已修复（同上） |

---

## 二、故障清单（暂不处理，需决策）

| # | 来源 | 问题 | 推迟原因 |
|---|------|------|----------|
| #7 | 断链 | `presetMcps.ts` 硬编码 `C:\Users\shuai\...` 路径 | 仅当前开发机有效 |
| #10 | 断链 | `getConnectorCategory` 与 `getCategoryByIdentifier` 数据重复维护 | 低影响，运行正常 |
| #11 | 断链 | `useInitPresetMcps` 与 `installedPlugins` 初始化竞态 | 服务端已跳过重复安装 |

---

## 三、待后端支持的代码

| # | 来源 | 文件/API | 功能 | 复用场景 |
|---|------|----------|------|----------|
| DATA-003 | bug-tracker | `discover.ts:567` `reportSkillEvent` | 技能点击/查看事件上报 | 无后端接口，`void payload` |
| #15a | 断链 | `chatGroup/index.ts:114` `batchCreateAgentsInGroup` | 批量添加成员到团队 | 专家团成员批量注册 |
| #15b | 断链 | `chatGroup/index.ts:155` `transferGroup` | 团队所有权转移 | 团队管理 UI |
| #15c | 断链 | `chatGroup/index.ts:140` `getGroupAgents` | 独立查询团队成员 | 当前通过 getGroupDetail 间接获取 |
| #14 | 断链 | `discover.ts:183` `getMcpManifest` | 纯查询 MCP manifest | 无调用者 |
| #16 | 断链 | `debug.ts` `debugService` | 开发环境调试工具 | 无调用者 |

---

## 四、gstack 审查遗留项（需你决策）

| # | 来源 | 问题 | 优先级 | 改动量 |
|---|------|------|--------|--------|
| #5 | gstack | 提取共享路由树定义，消除 ~1900 行重复 | P2 | 大（重构路由核心） |
| #6 | gstack | UGS 三页路由移入 `BusinessDesktopRoutesWithMainLayout` | P2 | 中（改变注入方式） |
| #7-gs | gstack | Desktop 重型路由恢复 lazy import | P2 | 大（影响启动行为） |
| #8-gs | gstack | UGS 三页纳入空闲预加载组 | P2 | 小（配置变更） |
| #10-gs | gstack | 提取 `useExpertTeam` hook 瘦身 UgsExperts | P3 | 小（纯重构） |
| #12-gs | gstack | 提取 scrollContainer 到 `_layout/index.tsx` | P2 | 中（改变 feature/route 边界） |
| #14-gs | gstack | UGS feature 内部添加 fine-grained ErrorBoundary | P2 | 中（新增组件） |

---

## 五、预存问题（上游继承，非本次引入）

| ID | 来源 | 说明 | 状态 |
|----|------|------|------|
| ERR-004 | bug-tracker | antd 废弃 API 警告（destroyOnClose/width/height/maskClosable） | 上游遗留，不影响功能 |
| #15-gs | gstack | workspace settings index 路由 Web redirect ↔ Desktop IndexPage 不一致 | P3，上游遗留 |
| #14-gs-review | gstack | Electron Desktop Onboarding 流程与 Web 一致性未验证 | P3，上游遗留 |

---

## 六、已完成修复（参考用）

| # | 来源 | 问题 | 修复日期 |
|---|------|------|----------|
| ERR-001 | bug-tracker | dayjs locale 加载 TypeError | 06-18 |
| SWR-001 | bug-tracker | onErrorRetry 参数索引错误 | 06-18 |
| ERR-003 | bug-tracker | Base UI nativeButton 警告 | 06-18 |
| ROUTE-001 | bug-tracker | 自定义侧边栏缺 UGS 条目 | 06-18 |
| ROUTE-002 | bug-tracker | CMDK 未收录 UGS 三页 | 06-18 |
| UX-001/002/003 | bug-tracker | UGS 三页 loading/error 三态 | 06-18 |
| ARCH-001 | bug-tracker | AddSkillButton 跨 feature 依赖 | 06-18 |
| ARCH-002 | bug-tracker | entry.desktop.tsx 缺 BootErrorBoundary | 06-18 |
| DATA-002 | bug-tracker | package.json metadata | 06-18 |
| DATA-005 | bug-tracker | DeferredStoreInitialization 预取 installedPlugins | 06-18 |
| #1/#2/#8/#9/#12 | 断链 | 侧边栏/CMDK/安装刷新/预取 | 06-18 |

---

**统计：** 已完成 14 项 | 待决策 7 项 | 故障清单 3 项 | 待后端支持 6 项 | 预存 3 项
