// UGS-MODIFY: UGS-016 能力中心 — Connector 卡片（弹窗模式，LobeHub 设计语言）
// UGS-MODIFY: UGS-XXX 分类映射重构 — 卡面显示推断分类标签
import { Modal } from '@lobehub/ui/base-ui';
import { Switch, Tag } from 'antd';
import { createStaticStyles } from 'antd-style';
import { ChevronRight, LinkIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

import ConnectorDetail from '@/features/Connectors/ConnectorDetail';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useToolStore } from '@/store/tool';
import type { ConnectorWithTools } from '@/store/tool/slices/connector';

import { inferCategory } from './capabilityData';
import { CATEGORY_MAP } from './types';

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
    padding-block: 12px;
    padding-inline: 16px;
  `,
  connectorName: css`
    font-size: 14px;
    font-weight: 500;
    color: ${cssVar.colorText};
  `,
  meta: css`
    font-size: 12px;
    color: ${cssVar.colorTextTertiary};
  `,
  categoryTag: css`
    display: inline-flex;
    gap: 2px;
    align-items: center;

    margin-block-start: 4px;

    font-size: 11px;
    color: ${cssVar.colorTextQuaternary};
  `,
  modalBody: css`
    overflow-y: auto;
    max-height: 60vh;
  `,
  modalBodyMobile: css`
    overflow-y: auto;
    max-height: 70vh;
  `,
  modalTitle: css`
    display: flex;
    gap: 8px;
    align-items: center;
  `,
}));

interface ConnectorCardProps {
  connector: ConnectorWithTools;
}

const ConnectorCard = memo<ConnectorCardProps>(({ connector }) => {
  const isMobile = useIsMobile();
  const [modalOpen, setModalOpen] = useState(false);
  const updateConnector = useToolStore((s) => s.updateConnector);
  const category = inferCategory(connector);
  const categoryMeta = CATEGORY_MAP[category];

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
          <LinkIcon color="var(--colorPrimary)" size={16} />
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
            <div className={styles.categoryTag}>
              {categoryMeta.icon} {categoryMeta.label}
            </div>
          </div>
          {/* 启用/禁用开关（点击不触发弹窗） */}
          <div onClick={(e) => e.stopPropagation()}>
            <Switch checked={connector.isEnabled} size="small" onChange={handleToggleEnabled} />
          </div>
          <ChevronRight color="var(--colorTextQuaternary)" size={16} />
        </div>
      </div>

      {/* 详情弹窗（复用 ConnectorDetail） */}
      <Modal
        centered={!isMobile}
        footer={null}
        open={modalOpen}
        width={isMobile ? '100%' : 720}
        title={
          <div className={styles.modalTitle}>
            <LinkIcon color="var(--colorPrimary)" size={16} />
            <span style={{ color: 'var(--colorText)', fontSize: 16, fontWeight: 600 }}>
              {connector.name}
            </span>
            <Tag color={statusColor} style={{ fontSize: 11, marginLeft: 4 }}>
              {statusLabel}
            </Tag>
          </div>
        }
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
