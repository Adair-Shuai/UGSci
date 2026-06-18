'use client';

import { cssVar } from 'antd-style';
import type { CSSProperties } from 'react';
import { memo } from 'react';

// UGS-MODIFY: UGS-010b UGSci 文字 Logo — "UG" 跟随当前文字色，"Sci" 用品牌主色
// 底层 colorPrimary 已在 AppTheme.tsx 中通过 customToken 精确覆盖为 #2563EB
//
// UGS-MODIFY: INC-004 统一品牌 Logo 组件
// 当 BRANDING_LOGO_URL 为空时，ProductLogo/CustomLogo 的所有分支（无 type / 3d / flat /
// mono / combine / text）都会 fallback 到本组件，避免渲染空图。
// 新代码直接用 <ProductLogo /> 即可，无需关心 type 是否会触发空图。
interface UGSciLogoProps {
  className?: string;
  size?: number;
  style?: CSSProperties;
}

const UGSciLogo = memo<UGSciLogoProps>(({ size = 28, style, className }) => {
  return (
    <div
      className={className}
      style={{
        fontSize: size / 1.5,
        fontWeight: 700,
        letterSpacing: '-0.5px',
        color: cssVar.colorText,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        userSelect: 'none',
        lineHeight: 1,
        ...style,
      }}
    >
      UG<span style={{ color: cssVar.colorPrimary }}>Sci</span>
    </div>
  );
});

export default UGSciLogo;
