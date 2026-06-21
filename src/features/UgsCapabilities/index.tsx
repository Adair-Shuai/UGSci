// UGS-MODIFY: UGS-016 能力中心主页面（LobeHub 设计语言 · 双 Tab 结构）
//
// 结构：
// - PageHeader：标题「能力中心」+ 右上角三模块（搜索框 + 能力市场按钮 + 添加能力按钮）
// - 统计概览：4 张 stat card 展示整体数据
// - 双 Tab：
//   - Tab1「常用能力」：按 6 个分类分组展示已安装 connector + 规划中能力
//   - Tab2「已安装」：展示所有已安装的 MCP connector，带数量角标与本地搜索
//
// 模块复用：
// - 分类分组展示：CommonTab（本目录）
// - 已安装列表展示：InstalledTab（本目录）
// - 能力市场弹窗：createUgsMarketModal('mcp', '能力市场')
// - 添加能力：AddSkillButton（4 个子弹窗，含自定义 MCP）
// - 能力卡片：ConnectorCard
import { Button } from '@lobehub/ui';
import { Search, Store } from 'lucide-react';
import { createStaticStyles } from 'antd-style';
import { App, Badge, Input, Tabs } from 'antd';
import { type FC, useEffect, useMemo, useState } from 'react';

import AddSkillButton from '@/features/UgsShared/AddSkillButton';
import { createUgsMarketModal } from '@/features/UgsMarket';
import PageHeader from '@/features/UgsShared/PageHeader';
import { useFetchInstalledPlugins } from '@/hooks/useFetchInstalledPlugins';
import { useToolStore } from '@/store/tool';
import { pluginSelectors } from '@/store/tool/selectors';
import { connectorSelectors } from '@/store/tool/slices/connector';

import { PLANNED_CAPABILITIES } from './capabilityData';
import CommonTab from './CommonTab';
import InstalledTab from './InstalledTab';
import { CATEGORIES } from './types';

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
    max-width: 1200px;
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
  statsGrid: css`
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
  `,
  statCard: css`
    flex: 1;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: ${cssVar.borderRadiusLG};
    background: ${cssVar.colorBgContainer};
    padding: 12px 16px;
  `,
  statLabel: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 12px;
  `,
  statValue: css`
    color: ${cssVar.colorText};
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  `,
  statValuePrimary: css`
    color: ${cssVar.colorPrimary};
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  `,
  statValueSuccess: css`
    color: ${cssVar.colorSuccess};
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  `,
  statValueWarning: css`
    color: ${cssVar.colorWarning};
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  `,
  statSub: css`
    color: ${cssVar.colorTextQuaternary};
    font-size: 11px;
  `,
  tabBadge: css`
    .ant-badge-count {
      background: ${cssVar.colorPrimary};
    }
  `,
}));

type MainTab = 'common' | 'installed';

const UgsCapabilitiesPage: FC = () => {
  const { message } = App.useApp();
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<MainTab>('common');

  // 拉取已安装 plugins（用于监听变化触发 fetchConnectors）
  useFetchInstalledPlugins();

  const connectedConnectors = useToolStore(connectorSelectors.connectedConnectors);
  const notConnectedConnectors = useToolStore(connectorSelectors.notConnectedConnectors);

  // 监听 installedPlugins 变化，自动触发 fetchConnectors
  // （市场 MCP 安装走 installMCPPlugin → refreshPlugins，不调 fetchConnectors；
  //  这里补齐：installedPlugins 变化 → fetchConnectors → connectors 更新）
  const installedPluginsCount = useToolStore(
    (s) => pluginSelectors.installedPlugins(s).length,
  );
  const fetchConnectors = useToolStore((s) => s.fetchConnectors);
  useEffect(() => {
    fetchConnectors();
  }, [installedPluginsCount, fetchConnectors]);

  const allConnectors = useMemo(
    () => [...connectedConnectors, ...notConnectedConnectors],
    [connectedConnectors, notConnectedConnectors],
  );

  // 统计概览数据
  const stats = useMemo(() => {
    const enabled = allConnectors.filter((c) => c.isEnabled);
    const totalTools = allConnectors.reduce((sum, c) => sum + (c.tools?.length ?? 0), 0);
    return {
      connected: connectedConnectors.length,
      enabled: enabled.length,
      planned: PLANNED_CAPABILITIES.length,
      total: allConnectors.length,
      totalTools,
    };
  }, [allConnectors, connectedConnectors.length]);

  // 右上角三模块：搜索框 + 能力市场 + 添加能力
  const headerExtra = (
    <div className={styles.toolbar}>
      <Input
        allowClear
        className={styles.searchInput}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索能力"
        prefix={<Search size={14} />}
        size="middle"
        value={keyword}
      />
      <Button
        icon={<Store size={16} />}
        onClick={() => createUgsMarketModal('mcp', '能力市场')}
        type="primary"
      >
        能力市场
      </Button>
      <AddSkillButton
        customLabel="添加能力"
        customTitle="添加能力"
        onPostInstall={() => {
          fetchConnectors();
          message.success('能力已添加');
        }}
      />
    </div>
  );

  return (
    <div className={styles.scrollContainer}>
      <div className={styles.page}>
        <PageHeader
          description="每个能力代表一个 MCP Server 或 Tool Provider，点击卡片查看工具列表和配置"
          emoji="🔧"
          extra={headerExtra}
          title="UGSci 能力中心"
        />

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>已连接能力</div>
            <div className={styles.statValueSuccess}>{stats.connected}</div>
            <div className={styles.statSub}>{stats.enabled} 个已启用</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>工具总数</div>
            <div className={styles.statValuePrimary}>{stats.totalTools}</div>
            <div className={styles.statSub}>跨 {stats.total} 个能力源</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>规划中</div>
            <div className={styles.statValueWarning}>{stats.planned}</div>
            <div className={styles.statSub}>CMG · Eclipse · OPM 等</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>分类</div>
            <div className={styles.statValuePrimary}>{CATEGORIES.length}</div>
            <div className={styles.statSub}>数据/工程/模拟/优化/知识/系统</div>
          </div>
        </div>

        {/* 双 Tab：常用能力 / 已安装 */}
        <Tabs
          activeKey={activeTab}
          items={[
            {
              children: <CommonTab keyword={keyword} />,
              key: 'common',
              label: '常用能力',
            },
            {
              children: <InstalledTab keyword={keyword} />,
              key: 'installed',
              label: (
                <Badge
                  className={styles.tabBadge}
                  count={allConnectors.length}
                  offset={[10, 0]}
                  size="small"
                >
                  <span>已安装</span>
                </Badge>
              ),
            },
          ]}
          onChange={(k) => setActiveTab(k as MainTab)}
          style={{ marginBottom: 16 }}
        />
      </div>
    </div>
  );
};

export default UgsCapabilitiesPage;
