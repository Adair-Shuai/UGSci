// UGS-MODIFY: UGS-016 能力中心 — 已安装能力 Tab
// 展示所有已安装的 MCP connector。
// 卡片复用 ConnectorCard，每个 card 点击弹出详情弹窗。
// 带本地搜索框筛选。
import { createStaticStyles } from 'antd-style';
import { Empty, Input, Skeleton } from 'antd';
import { Search } from 'lucide-react';
import { type FC, useMemo, useState } from 'react';

import { useToolStore } from '@/store/tool';
import { connectorSelectors } from '@/store/tool/slices/connector';

import ConnectorCard from './ConnectorCard';

const styles = createStaticStyles(({ css, cssVar, responsive }) => ({
  container: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  toolbar: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  searchInput: css`
    max-width: 280px;
    .ant-input-affix-wrapper {
      background: ${cssVar.colorBgContainer};
      border-color: ${cssVar.colorBorderSecondary};
    }
  `,
  hint: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 12px;
    margin-right: auto;
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
}));

interface InstalledTabProps {
  keyword: string;
  loading?: boolean;
}

const InstalledTab: FC<InstalledTabProps> = ({ keyword, loading }) => {
  const [localKeyword, setLocalKeyword] = useState('');

  const connectedConnectors = useToolStore(connectorSelectors.connectedConnectors);
  const notConnectedConnectors = useToolStore(connectorSelectors.notConnectedConnectors);
  const isConnectorsInit = useToolStore((s) => s.isConnectorsInit);

  const allConnectors = useMemo(
    () => [...connectedConnectors, ...notConnectedConnectors],
    [connectedConnectors, notConnectedConnectors],
  );

  const finalKeyword = (keyword || localKeyword).trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!finalKeyword) return allConnectors;
    return allConnectors.filter((c) => {
      if (c.identifier.toLowerCase().includes(finalKeyword)) return true;
      if (c.name?.toLowerCase().includes(finalKeyword)) return true;
      return false;
    });
  }, [allConnectors, finalKeyword]);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <span className={styles.hint}>
          共 {allConnectors.length} 个已安装能力 · 点击卡片查看详情
        </span>
        <Input
          allowClear
          className={styles.searchInput}
          onChange={(e) => setLocalKeyword(e.target.value)}
          placeholder="在已安装中搜索"
          prefix={<Search size={14} />}
          size="small"
          value={localKeyword}
        />
      </div>

      {loading && !isConnectorsInit && allConnectors.length === 0 ? (
        <div style={{ padding: '24px 0' }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : filtered.length === 0 ? (
        <Empty
          description={finalKeyword ? `未找到匹配「${finalKeyword}」的已安装能力` : '暂无已安装能力'}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 48 }}
        />
      ) : (
        <div className={styles.grid}>
          {filtered.map((conn) => (
            <ConnectorCard connector={conn} key={conn.id} />
          ))}
        </div>
      )}
    </div>
  );
};

export default InstalledTab;
