// UGS-MODIFY: UGS-016 能力中心主页面（复用 Connectors 模块，卡片式布局）
import { Button } from '@lobehub/ui';
import { Settings } from 'lucide-react';
import { Card, Empty, Tabs, Tag, Typography } from 'antd';
import { type FC, useCallback, useMemo, useState } from 'react';

import PageHeader from '@/features/UgsShared/PageHeader';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useToolStore } from '@/store/tool';
import { connectorSelectors } from '@/store/tool/slices/connector';

import ConnectorCard from './ConnectorCard';
import { useInitPresetMcps } from './useInitPresetMcps';
import { PLANNED_CAPABILITIES } from './capabilityData';
import { type CapabilityCategory, CATEGORIES, CATEGORY_MAP } from './types';

const { Text } = Typography;

const CATEGORY_ORDER: CapabilityCategory[] = [
  'data-connection',
  'engineering-calc',
  'numerical-sim',
  'optimization',
  'knowledge-retrieval',
  'system-collab',
];

// Connector identifier → 分类映射
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
  const navigate = useWorkspaceAwareNavigate();

  // 自动安装预置 MCP
  useInitPresetMcps();

  // Store: Connectors 列表（已连接 + 未连接）
  const connectedConnectors = useToolStore(connectorSelectors.connectedConnectors);
  const notConnectedConnectors = useToolStore(connectorSelectors.notConnectedConnectors);

  const [activeCategory, setActiveCategory] = useState<CapabilityCategory | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 合并所有 connectors
  const allConnectors = useMemo(() => {
    return [...connectedConnectors, ...notConnectedConnectors];
  }, [connectedConnectors, notConnectedConnectors]);

  // 按分类分组
  const connectorsByCategory = useMemo(() => {
    const map = new Map<CapabilityCategory, typeof allConnectors>();
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, []);
    }
    for (const conn of allConnectors) {
      const cat = getConnectorCategory(conn.identifier, conn.name);
      const list = map.get(cat) ?? [];
      list.push(conn);
      map.set(cat, list);
    }
    return map;
  }, [allConnectors]);

  // 统计
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

  const handleManageMCP = useCallback(() => {
    navigate('/settings/agent');
  }, [navigate]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // Tab items
  const tabItems = useMemo(() => {
    const items = [
      { key: 'all', label: `全部（${allConnectors.length}）` },
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
    return items;
  }, [allConnectors.length, connectorsByCategory]);

  // 当前展示的 connectors
  const visibleConnectors = useMemo(() => {
    if (activeCategory === 'all') return allConnectors;
    return connectorsByCategory.get(activeCategory) ?? [];
  }, [activeCategory, allConnectors, connectorsByCategory]);

  // 当前分类下的规划中能力
  const visiblePlanned = useMemo(() => {
    if (activeCategory === 'all') return PLANNED_CAPABILITIES;
    return PLANNED_CAPABILITIES.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        description="每个能力代表一个 MCP Server 或 Tool Provider，点击卡片展开查看工具列表和配置"
        emoji="🔧"
        extra={
          <Button icon={<Settings size={16} />} onClick={handleManageMCP} size="small">
            管理 MCP
          </Button>
        }
        title="UGSci 能力中心"
      />

      {/* 统计概览 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>已连接能力</div>
          <div style={{ color: '#52c41a', fontSize: 20, fontWeight: 600 }}>{stats.connected}</div>
          <div style={{ color: '#888', fontSize: 11 }}>{stats.enabled} 个已启用</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>工具总数</div>
          <div style={{ color: '#185FA5', fontSize: 20, fontWeight: 600 }}>{stats.totalTools}</div>
          <div style={{ color: '#888', fontSize: 11 }}>跨 {stats.total} 个能力源</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>规划中</div>
          <div style={{ color: '#faad14', fontSize: 20, fontWeight: 600 }}>{stats.planned}</div>
          <div style={{ color: '#888', fontSize: 11 }}>CMG · Eclipse · OPM 等</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>分类</div>
          <div style={{ color: '#185FA5', fontSize: 20, fontWeight: 600 }}>{CATEGORIES.length}</div>
          <div style={{ color: '#888', fontSize: 11 }}>数据/工程/模拟/优化/知识/系统</div>
        </Card>
      </div>

      {/* 分类 Tabs */}
      <Tabs
        activeKey={activeCategory}
        items={tabItems}
        onChange={(k) => setActiveCategory(k as CapabilityCategory | 'all')}
        style={{ marginBottom: 16 }}
      />

      {/* Connector 卡片 Grid */}
      {visibleConnectors.length === 0 && visiblePlanned.length === 0 ? (
        <Empty description="此分类暂无能力" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          }}
        >
          {/* 已连接的 Connector 卡片 */}
          {visibleConnectors.map((conn) => (
            <ConnectorCard
              connector={conn}
              expanded={expandedId === conn.id}
              key={conn.id}
              onToggleExpand={() => handleToggleExpand(conn.id)}
            />
          ))}

          {/* 规划中能力（只读卡片） */}
          {visiblePlanned.map((p, idx) => (
            <Card
              key={`planned-${idx}`}
              size="small"
              style={{ borderColor: '#f0f0f0', opacity: 0.7 }}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                    <span style={{ color: '#1f1f1f', fontSize: 14, fontWeight: 500 }}>
                      {p.name}
                    </span>
                    <Tag color="processing" style={{ fontSize: 10, margin: 0 }}>
                      规划中
                    </Tag>
                  </div>
                  <span style={{ color: '#888', fontSize: 11 }}>
                    {p.transportType} · {p.description.slice(0, 40)}
                    {p.description.length > 40 ? '…' : ''}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UgsCapabilitiesPage;
