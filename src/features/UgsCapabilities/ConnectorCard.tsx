// UGS-MODIFY: UGS-016 能力中心 — Connector 卡片（弹窗模式，LobeHub 设计语言）
import { Modal } from '@lobehub/ui/base-ui';
import { createStaticStyles } from 'antd-style';
import { ChevronRight, LinkIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { Switch, Tag } from 'antd';

import ConnectorDetail from '@/features/Connectors/ConnectorDetail';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { ConnectorWithTools } from '@/store/tool/slices/connector';
import { useToolStore } from '@/store/tool';

const styles = createStaticStyles(({ css, cssVar }) => ({
  card: css`
    cursor: pointer;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: ${cssVar.borderRadiusLG};
    background: ${cssVar.colorBgContainer};
    transition: all 0.2s ease;

    &:hover {
      border-color: ${cssVar.colorPrimary};
      box-shadow: ${cssVar.boxShadowTertiary};
    }
  `,
  cardBody: css`
    padding: 12px 16px;
  `,
  connectorName: css`
    color: ${cssVar.colorText};
    font-size: 14px;
    font-weight: 500;
  `,
  meta: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 12px;
  `,
  modalBody: css`
    max-height: 60vh;
    overflow-y: auto;
  `,
  modalBodyMobile: css`
    max-height: 70vh;
    overflow-y: auto;
  `,
  modalTitle: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
}));

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
      <div className={styles.card} onClick={handleCardClick}>
        <div className={styles.cardBody} style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
          <LinkIcon size={16} color="var(--colorPrimary)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
              <span className={styles.connectorName}>{connector.name}</span>
              <Tag color={statusColor} style={{ fontSize: 10, margin: 0 }}>
                {statusLabel}
              </Tag>
            </div>
            <span className={styles.meta}>
              {toolCount > 0 ? `${toolCount} 个工具` : '无工具'} · {connector.sourceType}
            </span>
          </div>
          {/* 启用/禁用开关（点击不触发弹窗） */}
          <div onClick={(e) => e.stopPropagation()}>
            <Switch checked={connector.isEnabled} onChange={handleToggleEnabled} size="small" />
          </div>
          <ChevronRight size={16} color="var(--colorTextQuaternary)" />
        </div>
      </div>

      {/* 详情弹窗（复用 ConnectorDetail） */}
      <Modal
        centered={!isMobile}
        footer={null}
        open={modalOpen}
        title={
          <div className={styles.modalTitle}>
            <LinkIcon size={16} color="var(--colorPrimary)" />
            <span style={{ color: 'var(--colorText)', fontSize: 16, fontWeight: 600 }}>
              {connector.name}
            </span>
            <Tag color={statusColor} style={{ fontSize: 11, marginLeft: 4 }}>
              {statusLabel}
            </Tag>
          </div>
        }
        width={isMobile ? '100%' : 720}
        onCancel={() => setModalOpen(false)}
      >
        <div className={isMobile ? styles.modalBodyMobile : styles.modalBody}>
          <ConnectorDetail connectorId={connector.id} />
        </div>
      </Modal>
    </>
  );
});

export default ConnectorCard;
