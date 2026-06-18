// UGS-MODIFY: UGS-016 能力中心主页面（LobeHub 设计语言）
//
// 右上角三模块（与技能中心/专家广场视觉对齐）：
// - 搜索框：本地筛选 connector
// - 能力市场：复用 Lobe `createSkillStoreModal()` 弹窗（含 MCP Tab）
// - 添加能力：复用 Lobe `AddSkillButton`（含 4 个子弹窗，其中 customMcp 为自定义 MCP）
//
// 操作闭环：
// - 自定义 MCP：CustomConnectorModal 创建后会 fetchConnectors → connectors 变化 → 自动 re-render
// - 市场 MCP：installMCPPlugin 只调 refreshPlugins 不调 fetchConnectors，
//   这里通过监听 installedPlugins.length 变化主动触发 fetchConnectors 实现自动刷新
import { Button } from '@lobehub/ui';
import { Plus, Search, Store } from 'lucide-react';
import { createStaticStyles } from 'antd-style';
import { App, Empty, Input, Skeleton, Tabs, Tag } from 'antd';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';

import AddSkillButton from '@/features/UgsShared/AddSkillButton';
import { createUgsMarketModal } from '@/features/UgsMarket';
import PageHeader from '@/features/UgsShared/PageHeader';
import { useFetchInstalledPlugins } from '@/hooks/useFetchInstalledPlugins';
import { useToolStore } from '@/store/tool';
import { pluginSelectors } from '@/store/tool/selectors';
import { connectorSelectors } from '@/store/tool/slices/connector';

import ConnectorCard from './ConnectorCard';
import { useInitPresetMcps } from './useInitPresetMcps';
import { PLANNED_CAPABILITIES } from './capabilityData';
import { type CapabilityCategory, CATEGORIES, CATEGORY_MAP } from './types';

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
  grid: css`
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  `,
  plannedCard: css`
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: ${cssVar.borderRadiusLG};
    background: ${cssVar.colorFillQuaternary};
    padding: 12px 16px;
    opacity: 0.75;
  `,
  plannedName: css`
    color: ${cssVar.colorText};
    font-size: 14px;
    font-weight: 500;
  `,
  plannedMeta: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 11px;
  `,
}));

const CATEGORY_ORDER: CapabilityCategory[] = [
  'data-connection',
  'engineering-calc',
  'numerical-sim',
  'optimization',
  'knowledge-retrieval',
  'system-collab',
];

const getConnectorCategory = (identifier: string, name: string): CapabilityCategory => {
  const map: Record<string, CapabilityCategory> = {
    'neqsim-mcp-server': 'engineering-calc',
    'pyrestoolbox-mcp': 'engineering-calc',
  };
  if (map[identifier]) return map[identifier];

  const lower = name.toLowerCase();
  if (lower.includes('search') || lower.includes('browser') || lower.includes('doc'))
    return 'knowledge-retrieval';
  if (lower.includes('file') || lower.includes('data')) return 'data-connection';
  return 'system-collab';
};

const UgsCapabilitiesPage: FC = () => {
  const { message } = App.useApp();
  const [keyword, setKeyword] = useState('');

  useInitPresetMcps();
  // 拉取已安装 plugins（用于监听变化触发 fetchConnectors）
  useFetchInstalledPlugins();

  const connectedConnectors = useToolStore(connectorSelectors.connectedConnectors);
  const notConnectedConnectors = useToolStore(connectorSelectors.notConnectedConnectors);
  const isConnectorsInit = useToolStore((s) => s.isConnectorsInit);

  // 监听 installedPlugins 数量变化，主动触发 fetchConnectors
  // （市场 MCP 安装走 installMCPPlugin → refreshPlugins，不调 fetchConnectors；
  //  这里补齐：installedPlugins 变化 → fetchConnectors → connectors 更新 → 自动 re-render）
  const installedPluginsCount = useToolStore(
    (s) => pluginSelectors.installedPlugins(s).length,
  );
  const fetchConnectors = useToolStore((s) => s.fetchConnectors);
  useEffect(() => {
    fetchConnectors();
  }, [installedPluginsCount, fetchConnectors]);

  const [activeCategory, setActiveCategory] = useState<CapabilityCategory | 'all'>('all');

  const allConnectors = useMemo(
    () => [...connectedConnectors, ...notConnectedConnectors],
    [connectedConnectors, notConnectedConnectors],
  );

  // 关键词过滤（按 identifier / name）
  const visibleConnectorsAll = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return allConnectors;
    return allConnectors.filter((c) => {
      if (c.identifier.toLowerCase().includes(k)) return true;
      if (c.name?.toLowerCase().includes(k)) return true;
      return false;
    });
  }, [allConnectors, keyword]);

  const connectorsByCategory = useMemo(() => {
    const map = new Map<CapabilityCategory, typeof allConnectors>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const conn of visibleConnectorsAll) {
      const cat = getConnectorCategory(conn.identifier, conn.name);
      const list = map.get(cat) ?? [];
      list.push(conn);
      map.set(cat, list);
    }
    return map;
  }, [visibleConnectorsAll]);

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

  const tabItems = useMemo(() => {
    return [
      { key: 'all', label: `全部（${visibleConnectorsAll.length}）` },
      ...CATEGORY_ORDER.map((cat) => {
        const list = connectorsByCategory.get(cat) ?? [];
        const plannedCount = PLANNED_CAPABILITIES.filter((p) => p.category === cat).length;
        const meta = CATEGORY_MAP[cat];
        return {
          key: cat,
          label: `${meta.icon} ${meta.label}（${list.length + plannedCount}）`,
        };
      }),
    ];
  }, [visibleConnectorsAll.length, connectorsByCategory]);

  const visibleConnectors = useMemo(() => {
    if (activeCategory === 'all') return visibleConnectorsAll;
    return connectorsByCategory.get(activeCategory) ?? [];
  }, [activeCategory, visibleConnectorsAll, connectorsByCategory]);

  const visiblePlanned = useMemo(() => {
    if (activeCategory === 'all') return PLANNED_CAPABILITIES;
    return PLANNED_CAPABILITIES.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

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
      {/* 能力市场：弹窗形式（复用 Lobe 社区 MCP 商店组件 + 分类筛选） */}
      <Button
        icon={<Store size={16} />}
        onClick={() => createUgsMarketModal('mcp', '能力市场')}
        type="primary"
      >
        能力市场
      </Button>
      {/* 添加能力：复用 Lobe AddSkillButton（4 个子弹窗，含自定义 MCP） */}
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

        {/* 统计概览 */}
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

        {/* 分类 Tabs */}
        <Tabs
          activeKey={activeCategory}
          items={tabItems}
          onChange={(k) => setActiveCategory(k as CapabilityCategory | 'all')}
          style={{ marginBottom: 16 }}
        />

        {/* Connector 卡片 Grid */}
        {!isConnectorsInit && allConnectors.length === 0 ? (
          <div style={{ padding: '24px 0' }}>
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : visibleConnectors.length === 0 && visiblePlanned.length === 0 ? (
          <Empty description="此分类暂无能力" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className={styles.grid}>
            {visibleConnectors.map((conn) => (
              <ConnectorCard connector={conn} key={conn.id} />
            ))}

            {visiblePlanned.map((p, idx) => (
              <div className={styles.plannedCard} key={`planned-${idx}`}>
                <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{p.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                      <span className={styles.plannedName}>{p.name}</span>
                      <Tag color="processing" style={{ fontSize: 10, margin: 0 }}>
                        规划中
                      </Tag>
                    </div>
                    <span className={styles.plannedMeta}>
                      {p.transportType} · {p.description.slice(0, 40)}
                      {p.description.length > 40 ? '…' : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UgsCapabilitiesPage;

