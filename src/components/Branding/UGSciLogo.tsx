'use client';

import { cssVar } from 'antd-style';
import { memo } from 'react';

// UGS-MODIFY: UGS-010b UGSci 文字 Logo — "UG" 跟随当前文字色，"Sci" 用品牌主色
// 底层 colorPrimary 已在 AppTheme.tsx 中通过 customToken 精确覆盖为 #2563EB
const UGSciLogo = memo<{ size?: number }>(({ size = 28 }) => {
  return (
    <div
      style={{
        fontSize: size / 1.5,
        fontWeight: 700,
        letterSpacing: '-0.5px',
        color: cssVar.colorText,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        userSelect: 'none',
        lineHeight: 1,
      }}
    >
      UG<span style={{ color: cssVar.colorPrimary }}>Sci</span>
    </div>
  );
});

export default UGSciLogo;
