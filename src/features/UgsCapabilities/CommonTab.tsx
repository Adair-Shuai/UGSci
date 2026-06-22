// UGS-MODIFY: UGS-016 能力中心 — 常用能力 Tab
// UGS-MODIFY: UGS-XXX 分类映射重构 — 删除重复的 getConnectorCategory，
// 统一使用 capabilityData.ts 中的 inferCategory。
import { Empty, Tag } from 'antd';
import { createStaticStyles } from 'antd-style';
import { type FC, useMemo } from 'react';

import { useToolStore } from '@/store/tool';
import { connectorSelectors } from '@/store/tool/slices/connector';

import { inferCategory, PLANNED_CAPABILITIES } from './capabilityData';
import ConnectorCard from './ConnectorCard';
import { type CapabilityCategory, CATEGORY_MAP, CATEGORY_ORDER } from './types';
import { useInitPresetMcps } from './useInitPresetMcps';

const styles = createStaticStyles(({ css, cssVar, responsive }) => ({
  container: css`
    display: flex;
    flex-direction: column;
    gap: 20px;
  `,
  groupSection: css`
    margin-block-end: 8px;
  `,
  groupTitle: css`
    display: flex;
    gap: 8px;
    align-items: center;

    margin-block: 0 12px;
    margin-inline: 0;

    font-size: 15px;
    font-weight: 600;
    color: ${cssVar.colorText};

    &::before {
      content: '';

      display: inline-block;

      width: 3px;
      height: 14px;
      border-radius: 2px;

      background: ${cssVar.colorPrimary};
    }
  `,
  groupCount: css`
    font-size: 12px;
    font-weight: 400;
    color: ${cssVar.colorTextTertiary};
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
    }
    ${responsive.sm} {
      grid-template-columns: 1fr;
    }
  `,
  plannedCard: css`
    padding-block: 12px;
    padding-inline: 16px;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: ${cssVar.borderRadiusLG};

    opacity: 0.75;
    background: ${cssVar.colorFillQuaternary};
  `,
  plannedName: css`
    font-size: 14px;
    font-weight: 500;
    color: ${cssVar.colorText};
  `,
  plannedMeta: css`
    font-size: 11px;
    color: ${cssVar.colorTextTertiary};
  `,
}));

interface CommonTabProps {
  keyword: string;
}

const CommonTab: FC<CommonTabProps> = ({ keyword }) => {
  useInitPresetMcps();
  const connectedConnectors = useToolStore(connectorSelectors.connectedConnectors);
  const notConnectedConnectors = useToolStore(connectorSelectors.notConnectedConnectors);
  const allConnectors = useMemo(
    () => [...connectedConnectors, ...notConnectedConnectors],
    [connectedConnectors, notConnectedConnectors],
  );
  const k = keyword.trim().toLowerCase();
  const filteredConnectors = useMemo(() => {
    if (!k) return allConnectors;
    return allConnectors.filter((c) => {
      if (c.identifier.toLowerCase().includes(k)) return true;
      if (c.name?.toLowerCase().includes(k)) return true;
      return false;
    });
  }, [allConnectors, k]);
  const connectorsByCategory = useMemo(() => {
    const map = new Map<CapabilityCategory, typeof filteredConnectors>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const conn of filteredConnectors) {
      const cat = inferCategory(conn);
      const list = map.get(cat) ?? [];
      list.push(conn);
      map.set(cat, list);
    }
    return map;
  }, [filteredConnectors]);
  const plannedByCategory = useMemo(() => {
    const map = new Map<CapabilityCategory, typeof PLANNED_CAPABILITIES>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const planned of PLANNED_CAPABILITIES) {
      const list = map.get(planned.category) ?? [];
      list.push(planned);
      map.set(planned.category, list);
    }
    return map;
  }, []);
  const hasContent = useMemo(() => {
    return CATEGORY_ORDER.some((cat) => {
      const conns = connectorsByCategory.get(cat) ?? [];
      const planned = plannedByCategory.get(cat) ?? [];
      return conns.length > 0 || planned.length > 0;
    });
  }, [connectorsByCategory, plannedByCategory]);
  if (!hasContent) {
    return (
      <Empty
        description={k ? `未找到匹配「${k}」的常用能力` : '暂无常用能力'}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ marginTop: 48 }}
      />
    );
  }
  return (
    <div className={styles.container}>
      {CATEGORY_ORDER.map((cat) => {
        const meta = CATEGORY_MAP[cat];
        const conns = connectorsByCategory.get(cat) ?? [];
        const planned = plannedByCategory.get(cat) ?? [];
        if (conns.length === 0 && planned.length === 0) return null;
        return (
          <div className={styles.groupSection} key={cat}>
            <h3 className={styles.groupTitle}>
              {meta.icon} {meta.label}
              <span className={styles.groupCount}>（{conns.length + planned.length}）</span>
            </h3>
            <div className={styles.grid}>
              {conns.map((conn) => (
                <ConnectorCard connector={conn} key={conn.id} />
              ))}
              {planned.map((p, idx) => (
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
          </div>
        );
      })}
    </div>
  );
};

export default CommonTab;
