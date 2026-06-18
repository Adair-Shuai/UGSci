// UGS-MODIFY: UGS-017 技能中心主页面（WorkBuddy 风格 · 双 Tab）
//
// 结构：
// - PageHeader：标题「技能中心」+ 右上角三模块（搜索框 + 技能市场按钮 + 添加技能按钮）
// - 双 Tab：
//   - Tab1「常用技能」：展示油气/储气库常用 Lobe builtin skill（Agent Skills），动态配置
//   - Tab2「已安装」：展示已安装的 builtin skills，带数量角标
// - 点击右上角「技能市场」按钮 → 弹窗复用 UgsMarket（与能力市场同构，type='skill'）
//
// 核心原则：技能中心只包括「技能（skills）」，不包括工具（tools）或 MCP
// - skills（builtinSkills）：lobe-agent-browser / lobe-artifacts / lobehub / task
// - tools（builtinTools）：lobe-cloud-sandbox / lobe-user-memory / ...  ← 不属于技能中心
// - MCP（installedPlugins）：github / notion / neqsim / ...              ← 不属于技能中心
//
// 模块复用（与能力市场完全同构）：
// - 卡片模板：Lobe `BuiltinItem`
// - 详情弹窗：Lobe `createBuiltinAgentSkillDetailModal`（builtinSkills 统一用此 API）
// - 技能市场弹窗：`createUgsMarketModal('skill', '技能市场')`（与能力市场 `createUgsMarketModal('mcp', '能力市场')` 同构）
// - 添加技能：Lobe `AddSkillButton`（4 个子弹窗）
import { createStaticStyles } from 'antd-style';
import { Badge, Button, Input, Tabs } from 'antd';
import { Search, Store } from 'lucide-react';
import { type FC, useState } from 'react';
import { mutate } from 'swr';

import { createUgsMarketModal } from '@/features/UgsMarket';
import PageHeader from '@/features/UgsShared/PageHeader';
import { useFetchInstalledPlugins } from '@/hooks/useFetchInstalledPlugins';
import { toolKeys } from '@/libs/swr/keys';
import { useToolStore } from '@/store/tool';

import AddSkillButton from './AddSkillButton';
import CommonSkillsTab from './CommonSkillsTab';
import InstalledTab from './InstalledTab';

const styles = createStaticStyles(({ css, cssVar }) => ({
  scrollContainer: css`
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;

    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background: ${cssVar.colorFillSecondary};
      border-radius: 3px;
    }
  `,
  page: css`
    padding: 24px 32px;
    max-width: 1400px;
    margin: 0 auto;
  `,
  toolbar: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  searchInput: css`
    max-width: 280px;

    .ant-input-affix-wrapper {
      background: ${cssVar.colorBgContainer};
      border-color: ${cssVar.colorBorderSecondary};
    }
  `,
  tabBadge: css`
    .ant-badge-count {
      background: ${cssVar.colorPrimary};
    }
  `,
}));

type MainTab = 'common' | 'installed';

const UgsSkillsPage: FC = () => {
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<MainTab>('common');

  // 拉取 builtin skills（LobeChat 原生 fetch hooks）
  const { isLoading: pluginsLoading } = useFetchInstalledPlugins();
  const useFetchUninstalledBuiltinTools = useToolStore((s) => s.useFetchUninstalledBuiltinTools);
  useFetchUninstalledBuiltinTools(true);

  // 已安装技能数量（只计 builtinSkills，不含 builtinTools / MCP）
  const installedCount = useToolStore((s) => (s.builtinSkills ?? []).length);

  // 右上角三模块：搜索框 + 技能市场按钮 + 添加技能按钮
  const headerExtra = (
    <div className={styles.toolbar}>
      <Input
        allowClear
        className={styles.searchInput}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索技能"
        prefix={<Search size={14} />}
        size="middle"
        value={keyword}
      />
      {/* 技能市场入口按钮：与能力市场同构，复用 UgsMarket 弹窗（type='skill'，连接 LobeHub 技能网络库） */}
      <Button
        icon={<Store size={16} />}
        onClick={() => createUgsMarketModal('skill', '技能市场')}
        type="primary"
      >
        技能市场
      </Button>
      {/* 添加技能按钮：复用 Lobe AddSkillButton（4 个子弹窗） */}
      <AddSkillButton
        onPostInstall={() => {
          mutate(toolKeys.installedPlugins());
        }}
      />
    </div>
  );

  return (
    <div className={styles.scrollContainer}>
      <div className={styles.page}>
        <PageHeader
          description="技能中心 · 常用技能精选与已安装管理，点击「技能市场」探索更多"
          emoji="✨"
          extra={headerExtra}
          title="技能中心"
        />

        <Tabs
          activeKey={activeTab}
          items={[
            {
              children: <CommonSkillsTab keyword={keyword} />,
              key: 'common',
              label: '常用技能',
            },
            {
              children: <InstalledTab keyword={keyword} loading={pluginsLoading} />,
              key: 'installed',
              label: (
                <Badge
                  className={styles.tabBadge}
                  count={installedCount}
                  offset={[10, 0]}
                  size="small"
                >
                  <span>已安装</span>
                </Badge>
              ),
            },
          ]}
          onChange={(k) => setActiveTab(k as MainTab)}
        />
      </div>
    </div>
  );
};

export default UgsSkillsPage;
