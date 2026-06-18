// UGS-MODIFY: UGS-016 能力中心主页面（重构为插件市场风格）
import { Button } from '@lobehub/ui';
import type { LobeTool } from '@lobechat/types';
import { Settings } from 'lucide-react';
import { Badge, Card, Drawer, Empty, Space, Tabs, Tag, Typography } from 'antd';
import { type FC, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import PageHeader from '@/features/UgsShared/PageHeader';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useToolStore } from '@/store/tool';
import { mcpStoreSelectors } from '@/store/tool/slices/mcpStore';
import { pluginSelectors } from '@/store/tool/slices/plugin/selectors';

import CapabilityCard from './CapabilityCard';
import CapabilityDrawerContent from './CapabilityDrawerContent';
import { getCategoryByIdentifier, guessCategoryByName, PLANNED_CAPABILITIES } from './capabilityData';
import { type CapabilityCardData, type CapabilityCategory, CATEGORIES, CATEGORY_MAP } from './types';
import { useInitPresetMcps } from './useInitPresetMcps';

const { Text } = Typography;

const CATEGORY_ORDER: CapabilityCategory[] = [
  'data-connection',
  'engineering-calc',
  'numerical-sim',
  'optimization',
  'knowledge-retrieval',
  'system-collab',
];

const UgsCapabilitiesPage: FC = () => {
  const { t } = useTranslation('common');
  const navigate = useWorkspaceAwareNavigate();

  // 自动安装预置 MCP（NeqSim + pyResToolbox）
  useInitPresetMcps();

  // Store: 已安装插件列表
  const installedPlugins = useToolStore(pluginSelectors.installedPlugins);
  // Store: 各 MCP 测试状态 map（identifier → {loading, error}）
  // 注意：getMCPConnectionTestState 是按 id 返回的 selector 工厂，这里用 installedPlugins 遍历

  const [activeCategory, setActiveCategory] = useState<CapabilityCategory | 'all'>('all');
  const [drawerCapability, setDrawerCapability] = useState<CapabilityCardData | null>(null);

  // 构建能力卡片数据：已安装 + 规划中
  const allCapabilities = useMemo<CapabilityCardData[]>(() => {
    // 已安装
    const installed: CapabilityCardData[] = installedPlugins.map((plugin: LobeTool) => {
      const identifier = plugin.identifier;
      const category = (getCategoryByIdentifier(identifier) ??
        guessCategoryByName(plugin.manifest?.title ?? identifier)) as CapabilityCategory;
      const functionCount = plugin.manifest?.api?.length ?? 0;
      const testError = useToolStore.getState().mcpTestErrors?.[identifier];
      const testLoading = useToolStore.getState().mcpTestLoading?.[identifier];

      let connectionStatus: CapabilityCardData['connectionStatus'] = 'untested';
      if (testLoading) {
        connectionStatus = 'untested';
      } else if (testError) {
        connectionStatus = 'error';
      } else if (plugin.manifest?.api && plugin.manifest.api.length > 0) {
        connectionStatus = 'connected';
      }

      return {
        category,
        connectionStatus,
        functionCount,
        icon: plugin.manifest?.meta?.avatar ?? '🔌',
        identifier,
        installed: true,
        lobeTool: plugin,
        name: plugin.manifest?.title ?? identifier,
        description: plugin.manifest?.description ?? plugin.manifest?.meta?.description ?? '',
      };
    });

    // 规划中（去重：已安装的 identifier 不重复展示）
    const installedIds = new Set(installedPlugins.map((p) => p.identifier));
    const planned: CapabilityCardData[] = PLANNED_CAPABILITIES.filter(
      (p) => !installedIds.has(p.plannedIdentifier),
    ).map((p) => ({
      category: p.category,
      connectionStatus: 'planned' as const,
      functionCount: 0,
      icon: p.icon,
      installed: false,
      name: p.name,
      description: p.description,
    }));

    return [...installed, ...planned];
  }, [installedPlugins]);

  // 按分类分组
  const capabilitiesByCategory = useMemo(() => {
    const map = new Map<CapabilityCategory, CapabilityCardData[]>();
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, allCapabilities.filter((c) => c.category === cat));
    }
    return map;
  }, [allCapabilities]);

  // 统计
  const stats = useMemo(() => {
    const installed = allCapabilities.filter((c) => c.installed);
    const connected = installed.filter((c) => c.connectionStatus === 'connected');
    const planned = allCapabilities.filter((c) => c.connectionStatus === 'planned');
    const totalFunctions = installed.reduce((sum, c) => sum + c.functionCount, 0);
    return { connected: connected.length, installed: installed.length, planned: planned.length, totalFunctions };
  }, [allCapabilities]);

  // 点击卡片
  const handleCardClick = useCallback((cap: CapabilityCardData) => {
    setDrawerCapability(cap);
  }, []);

  // 管理 MCP
  const handleManageMCP = useCallback(() => {
    navigate('/settings/agent');
  }, [navigate]);

  // Tab items
  const tabItems = useMemo(() => {
    const items = [
      {
        key: 'all',
        label: `全部（${allCapabilities.length}）`,
      },
      ...CATEGORY_ORDER.map((cat) => {
        const list = capabilitiesByCategory.get(cat) ?? [];
        const meta = CATEGORY_MAP[cat];
        return {
          key: cat,
          label: `${meta.icon} ${meta.label}（${list.length}）`,
        };
      }),
    ];
    return items;
  }, [allCapabilities.length, capabilitiesByCategory]);

  // 当前展示的能力列表
  const visibleCapabilities = useMemo(() => {
    if (activeCategory === 'all') return allCapabilities;
    return capabilitiesByCategory.get(activeCategory) ?? [];
  }, [activeCategory, allCapabilities, capabilitiesByCategory]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        description="平台底层原子能力（MCP / API / 算法），每个能力代表一个 MCP Server 或 Tool Provider"
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
          <div style={{ color: '#888', fontSize: 11 }}>已安装能力</div>
          <div style={{ color: '#185FA5', fontSize: 20, fontWeight: 600 }}>{stats.installed}</div>
          <div style={{ color: '#888', fontSize: 11 }}>{stats.connected} 个已连接</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>Tool Functions</div>
          <div style={{ color: '#185FA5', fontSize: 20, fontWeight: 600 }}>{stats.totalFunctions}</div>
          <div style={{ color: '#888', fontSize: 11 }}>跨 {stats.installed} 个能力源</div>
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

      {/* 能力卡片 Grid */}
      {visibleCapabilities.length === 0 ? (
        <Empty description="此分类暂无能力" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
        >
          {visibleCapabilities.map((cap, idx) => (
            <CapabilityCard
              capability={cap}
              key={cap.identifier ?? `planned-${idx}`}
              onClick={() => handleCardClick(cap)}
            />
          ))}
        </div>
      )}

      {/* 详情 Drawer */}
      <Drawer
        onClose={() => setDrawerCapability(null)}
        open={!!drawerCapability}
        title={
          drawerCapability && (
            <Space>
              <span style={{ fontSize: 20 }}>{drawerCapability.icon}</span>
              <span>{drawerCapability.name}</span>
              <Tag
                color={
                  drawerCapability.connectionStatus === 'connected'
                    ? 'success'
                    : drawerCapability.connectionStatus === 'planned'
                      ? 'processing'
                      : 'default'
                }
              >
                {drawerCapability.connectionStatus === 'connected'
                  ? '已连接'
                  : drawerCapability.connectionStatus === 'planned'
                    ? '规划中'
                    : drawerCapability.connectionStatus === 'error'
                      ? '异常'
                      : '未测试'}
              </Tag>
            </Space>
          )
        }
        width={640}
      >
        {drawerCapability && <CapabilityDrawerContent capability={drawerCapability} />}
      </Drawer>
    </div>
  );
};

export default UgsCapabilitiesPage;
