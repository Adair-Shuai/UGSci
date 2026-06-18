// UGS-MODIFY: UGS-016 能力中心 — Connector 卡片（展开/收起，复用 ConnectorDetail）
import { ChevronDown, ChevronRight, LinkIcon } from 'lucide-react';
import { memo, useCallback } from 'react';
import { Card, Switch, Tag } from 'antd';

import ConnectorDetail from '@/features/Connectors/ConnectorDetail';
import type { ConnectorWithTools } from '@/store/tool/slices/connector';
import { useToolStore } from '@/store/tool';

interface ConnectorCardProps {
  connector: ConnectorWithTools;
  expanded: boolean;
  onToggleExpand: () => void;
}

const ConnectorCard = memo<ConnectorCardProps>(({ connector, expanded, onToggleExpand }) => {
  const updateConnector = useToolStore((s) => s.updateConnector);

  const handleToggleEnabled = useCallback(
    (checked: boolean) => {
      updateConnector(connector.id, { isEnabled: checked });
    },
    [connector.id, updateConnector],
  );

  const toolCount = connector.tools?.length ?? 0;
  const statusColor = connector.status === 'active' || connector.isEnabled ? 'success' : 'default';
  const statusLabel = connector.isEnabled ? '已启用' : '已禁用';

  return (
    <Card
      size="small"
      style={{
        borderColor: expanded ? '#2563EB' : '#e8e8e8',
        transition: 'all 0.2s ease',
      }}
      styles={{ body: { padding: 0 } }}
    >
      {/* 卡片头部（可点击展开） */}
      <div
        onClick={onToggleExpand}
        style={{
          alignItems: 'center',
          cursor: 'pointer',
          display: 'flex',
          gap: 10,
          padding: '12px 16px',
        }}
      >
        {expanded ? (
          <ChevronDown size={16} color="#888" />
        ) : (
          <ChevronRight size={16} color="#888" />
        )}
        <LinkIcon size={16} color="#185FA5" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
            <span style={{ color: '#1f1f1f', fontSize: 14, fontWeight: 500 }}>
              {connector.name}
            </span>
            <Tag color={statusColor} style={{ fontSize: 10, margin: 0 }}>
              {statusLabel}
            </Tag>
          </div>
          <span style={{ color: '#888', fontSize: 11 }}>
            {toolCount > 0 ? `${toolCount} 个工具` : '无工具'} · {connector.sourceType}
          </span>
        </div>
        {/* 启用/禁用开关（点击不触发展开） */}
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={connector.isEnabled}
            onChange={handleToggleEnabled}
            size="small"
          />
        </div>
      </div>

      {/* 展开后的详情区域（复用 ConnectorDetail） */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid #f0f0f0',
            padding: '8px 16px 16px',
          }}
        >
          <ConnectorDetail connectorId={connector.id} />
        </div>
      )}
    </Card>
  );
});

export default ConnectorCard;
