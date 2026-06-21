// UGS-MODIFY: UGS-016 能力中心 — 常用能力 Tab
// 与「已安装」Tab 并列的第一个 Tab。
// 展示 UGSci 预置的常用 MCP 能力，按 6 个分类分组展示。
// 每个分类下展示该分类已安装的 connector + 规划中的能力。
// 卡片复用 ConnectorCard，规划中复用 plannedCard 样式。
import { createStaticStyles } from 'antd-style';
import { Empty, Tag } from 'antd';
import { type FC, useMemo } from 'react';

import { useToolStore } from '@/store/tool';
import { connectorSelectors } from '@/store/tool/slices/connector';

import { useInitPresetMcps } from './useInitPresetMcps';
import { PLANNED_CAPABILITIES } from './capabilityData';
import ConnectorCard from './ConnectorCard';
import { type CapabilityCategory, CATEGORY_MAP } from './types';

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

const styles = createStaticStyles(({ css, cssVar, responsive }) => ({
  container: css`
    display: flex;
    flex-direction: column;
    gap: 20px;
  `,
  groupSection: css`
    margin-bottom: 8px;
  `,
  groupTitle: css`
    color: ${cssVar.colorText};
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    &::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 14px;
      background: ${cssVar.colorPrimary};
      border-radius: 2px;
    }
  `,
  groupCount: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 12px;
    font-weight: 400;
  `,
  grid: css`
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(3, 1fr);
    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
    }
    ${responsive.sm} {
      grid-template-columns: 1fr;
    }
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
      const cat = getConnectorCategory(conn.identifier, conn.name);
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
              <span className={styles.groupCount}>
                （{conns.length + planned.length}）
              </span>
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
