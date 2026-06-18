// UGS-MODIFY: UGS-016 能力中心 — Connector 卡片（弹窗模式，复用 ConnectorDetail）
import { Modal } from '@lobehub/ui/base-ui';
import { ChevronRight, LinkIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { Card, Switch, Tag } from 'antd';

import ConnectorDetail from '@/features/Connectors/ConnectorDetail';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { ConnectorWithTools } from '@/store/tool/slices/connector';
import { useToolStore } from '@/store/tool';

interface ConnectorCardProps {
  connector: ConnectorWithTools;
}

const ConnectorCard = memo<ConnectorCardProps>(({ connector }) => {
  const isMobile = useIsMobile();
  const [modalOpen, setModalOpen] = useState(false);
  const updateConnector = useToolStore((s) => s.updateConnector);

  const handleToggleEnabled = useCallback(
    (checked: boolean) => {
      updateConnector(connector.id, { isEnabled: checked });
    },
    [connector.id, updateConnector],
  );

  const handleCardClick = useCallback(() => {
    setModalOpen(true);
  }, []);

  const toolCount = connector.tools?.length ?? 0;
  const statusColor = connector.isEnabled ? 'success' : 'default';
  const statusLabel = connector.isEnabled ? '已启用' : '已禁用';

  return (
    <>
      <Card
        hoverable
        onClick={handleCardClick}
        size="small"
        style={{
          borderColor: '#e8e8e8',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
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
          {/* 启用/禁用开关（点击不触发弹窗） */}
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={connector.isEnabled}
              onChange={handleToggleEnabled}
              size="small"
            />
          </div>
          <ChevronRight size={16} color="#bbb" />
        </div>
      </Card>

      {/* 详情弹窗（复用 ConnectorDetail） */}
      <Modal
        centered={!isMobile}
        footer={null}
        open={modalOpen}
        title={
          <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
            <LinkIcon size={16} color="#185FA5" />
            <span>{connector.name}</span>
            <Tag color={statusColor} style={{ fontSize: 10, marginLeft: 4 }}>
              {statusLabel}
            </Tag>
          </div>
        }
        width={isMobile ? '100%' : 720}
        onCancel={() => setModalOpen(false)}
      >
        <div
          style={{
            maxHeight: isMobile ? '70vh' : '60vh',
            overflowY: 'auto',
          }}
        >
          <ConnectorDetail connectorId={connector.id} />
        </div>
      </Modal>
    </>
  );
});

export default ConnectorCard;
