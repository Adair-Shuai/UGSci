// UGS-MODIFY: UGS-015/016/017 三页共用页头组件
import { type FC, type ReactNode } from 'react';

interface PageHeaderProps {
  description: string;
  emoji: string;
  extra?: ReactNode;
  title: string;
}

const PageHeader: FC<PageHeaderProps> = ({ description, emoji, extra, title }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
      <span style={{ fontSize: 26 }}>{emoji}</span>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1f1f1f', margin: 0 }}>
        {title}
      </h1>
      {extra && <div style={{ marginLeft: 'auto' }}>{extra}</div>}
    </div>
    <p style={{ color: '#888', fontSize: 13, marginTop: 6, marginLeft: 36 }}>
      {description}
    </p>
  </div>
);

export default PageHeader;
