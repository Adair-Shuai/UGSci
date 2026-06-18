// UGS-MODIFY: UGS-016 能力中心 — 能力卡片
import { Badge, Card, Tag } from 'antd';
import { memo } from 'react';

import type { CapabilityCardData } from './types';

interface CapabilityCardProps {
  capability: CapabilityCardData;
  onClick?: () => void;
}

const STATUS_CONFIG: Record<
  CapabilityCardData['connectionStatus'],
  { color: string; label: string; tagColor: string }
> = {
  connected: { color: '#52c41a', label: '已连接', tagColor: 'success' },
  disconnected: { color: '#d9d9d9', label: '未连接', tagColor: 'default' },
  error: { color: '#ff4d4f', label: '连接异常', tagColor: 'error' },
  untested: { color: '#faad14', label: '未测试', tagColor: 'warning' },
  planned: { color: '#185FA5', label: '规划中', tagColor: 'processing' },
};

const CapabilityCard = memo<CapabilityCardProps>(({ capability, onClick }) => {
  const status = STATUS_CONFIG[capability.connectionStatus];

  return (
    <Card
      hoverable={!!onClick && capability.installed}
      loading={false}
      onClick={capability.installed ? onClick : undefined}
      size="small"
      style={{
        borderColor: capability.installed ? '#e8e8e8' : '#f0f0f0',
        cursor: capability.installed && onClick ? 'pointer' : 'default',
        height: '100%',
        opacity: capability.installed ? 1 : 0.75,
        transition: 'all 0.2s ease',
      }}
      styles={{ body: { padding: 14 } }}
    >
      <div style={{ alignItems: 'center', display: 'flex', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 24 }}>{capability.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#1f1f1f', fontSize: 14, fontWeight: 500 }}>
              {capability.name}
            </span>
          </div>
          <Tag color={status.tagColor} style={{ fontSize: 10, margin: 0, marginTop: 2 }}>
            {status.label}
          </Tag>
        </div>
      </div>

      <div
        style={{
          color: '#595959',
          fontSize: 12,
          lineHeight: 1.5,
          marginBottom: 8,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {capability.description}
      </div>

      <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#888', fontSize: 11 }}>
          {capability.functionCount > 0
            ? `${capability.functionCount} 个功能`
            : capability.installed
              ? '加载中'
              : '尚未安装'}
        </span>
        {capability.identifier && (
          <span style={{ color: '#bbb', fontSize: 10, fontFamily: 'monospace' }}>
            {capability.identifier.length > 20
              ? capability.identifier.slice(0, 20) + '…'
              : capability.identifier}
          </span>
        )}
      </div>
    </Card>
  );
});

export default CapabilityCard;
