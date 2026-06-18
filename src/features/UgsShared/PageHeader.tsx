// UGS-MODIFY: UGS-015/016/017 三页共用页头组件（LobeHub 设计语言）
import { createStaticStyles } from 'antd-style';
import { type FC, type ReactNode } from 'react';

const styles = createStaticStyles(({ css, cssVar }) => ({
  wrapper: css`
    margin-bottom: 24px;
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: 10px;
  `,
  emoji: css`
    font-size: 26px;
    line-height: 1;
  `,
  title: css`
    font-size: 22px;
    font-weight: 600;
    color: ${cssVar.colorText};
    margin: 0;
    line-height: 1.4;
  `,
  description: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 13px;
    margin-top: 6px;
    margin-left: 36px;
    line-height: 1.5;
  `,
}));

interface PageHeaderProps {
  description: string;
  emoji: string;
  extra?: ReactNode;
  title: string;
}

const PageHeader: FC<PageHeaderProps> = ({ description, emoji, extra, title }) => (
  <div className={styles.wrapper}>
    <div className={styles.header}>
      <span className={styles.emoji}>{emoji}</span>
      <h1 className={styles.title}>{title}</h1>
      {extra && <div style={{ marginLeft: 'auto' }}>{extra}</div>}
    </div>
    <p className={styles.description}>{description}</p>
  </div>
);

export default PageHeader;
