'use client';

import { memo } from 'react';

// UGS-MODIFY: UGS-010b UGSci 文字 Logo — "UG" 跟随当前文字色，"Sci" 用品牌主色 #2563EB
// 直接硬编码品牌色，避免 antd-style 的 cssVar.colorPrimary 被 @lobehub/ui ThemeProvider
// 的 customTheme.primaryColor（用户可自定义主题色）覆盖导致颜色不正确
const UGSciLogo = memo<{ size?: number }>(({ size = 28 }) => {
  return (
    <div
      style={{
        fontSize: size / 1.5,
        fontWeight: 700,
        letterSpacing: '-0.5px',
        color: 'inherit',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        userSelect: 'none',
        lineHeight: 1,
      }}
    >
      UG<span style={{ color: '#2563EB' }}>Sci</span>
    </div>
  );
});

export default UGSciLogo;
