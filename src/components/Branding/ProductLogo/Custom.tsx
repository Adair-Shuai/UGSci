import { BRANDING_LOGO_URL, BRANDING_NAME } from '@lobechat/business-const';
import { type IconType } from '@lobehub/icons';
import { type FlexboxProps } from '@lobehub/ui';
import { Flexbox } from '@lobehub/ui';
import { type LobeChatProps } from '@lobehub/ui/brand';
import { createStaticStyles, cssVar } from 'antd-style';
import { type ReactNode } from 'react';
import { memo } from 'react';

import { type ImageProps } from '@/libs/next/Image';
import Image from '@/libs/next/Image';

import UGSciLogo from '../UGSciLogo';

const styles = createStaticStyles(({ css }) => {
  return {
    extraTitle: css`
      font-weight: 300;
      white-space: nowrap;
    `,
  };
});

// UGS-MODIFY: INC-004 统一品牌 Logo 兜底
// 当 BRANDING_LOGO_URL 为空字符串时（UGSci 项目的默认配置），CustomImageLogo 会渲染
// 一张 src='' 的空图，导致所有未传 type="text" 的 <ProductLogo /> 调用点显示空白。
// 此开关在模块加载时求值一次：没有 logo URL 时，所有分支统一 fallback 到 UGSciLogo
// （两色 "UG"+"Sci" 文字 logo），从源头消除"logo 不显示"问题。
// 新代码直接用 <ProductLogo size={n} /> 即可，无需关心 type。
const hasLogoUrl = !!BRANDING_LOGO_URL;

const CustomTextLogo = memo<FlexboxProps & { size: number }>(({ size, style, ...rest }) => {
  return (
    <Flexbox
      height={size}
      style={{
        fontSize: size / 1.5,
        fontWeight: 'bolder',
        userSelect: 'none',
        ...style,
      }}
      {...rest}
    >
      {BRANDING_NAME}
    </Flexbox>
  );
});

const CustomImageLogo = memo<Omit<ImageProps, 'alt' | 'src'> & { size: number }>(
  ({ size, ...rest }) => {
    return (
      <Image
        alt={BRANDING_NAME}
        height={size}
        src={BRANDING_LOGO_URL}
        unoptimized={true}
        width={size}
        {...rest}
      />
    );
  },
);

const Divider: IconType = (({ ref, size = '1em', style, ...rest }) => (
  <svg
    fill="none"
    height={size}
    ref={ref}
    shapeRendering="geometricPrecision"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flex: 'none', lineHeight: 1, ...style }}
    viewBox="0 0 24 24"
    width={size}
    {...rest}
  >
    <path d="M16.88 3.549L7.12 20.451" />
  </svg>
)) as IconType;

const CustomLogo = memo<LobeChatProps>(({ extra, size = 32, className, style, type, ...rest }) => {
  // UGS-MODIFY: INC-004 — 无 logo 图片 URL 时，所有 type 统一 fallback 到 UGSciLogo
  if (!hasLogoUrl) {
    if (!extra) return <UGSciLogo size={size} style={style} />;

    // 保留 extra 语义：logo + 分隔线 + extra 文字
    const extraSize = Math.round((size / 3) * 1.9);
    return (
      <Flexbox horizontal align={'center'} className={className} flex={'none'} {...rest}>
        <UGSciLogo size={size} style={style} />
        <Divider size={extraSize} style={{ color: cssVar.colorFill }} />
        <div className={styles.extraTitle} style={{ fontSize: extraSize }}>
          {extra}
        </div>
      </Flexbox>
    );
  }

  let logoComponent: ReactNode;

  switch (type) {
    case '3d':
    case 'flat': {
      logoComponent = <CustomImageLogo size={size} style={style} {...rest} />;
      break;
    }
    case 'mono': {
      logoComponent = (
        <CustomImageLogo size={size} style={{ filter: 'grayscale(100%)', ...style }} {...rest} />
      );
      break;
    }
    case 'text': {
      logoComponent = <CustomTextLogo size={size} style={style} {...rest} />;
      break;
    }
    case 'combine': {
      logoComponent = (
        <>
          <CustomImageLogo size={size} />
          <CustomTextLogo size={size} style={{ marginLeft: Math.round(size / 4) }} />
        </>
      );

      if (!extra)
        logoComponent = (
          <Flexbox horizontal align={'center'} flex={'none'} {...rest}>
            {logoComponent}
          </Flexbox>
        );

      break;
    }
    default: {
      logoComponent = <CustomImageLogo size={size} style={style} {...rest} />;
      break;
    }
  }

  if (!extra) return logoComponent;

  const extraSize = Math.round((size / 3) * 1.9);

  return (
    <Flexbox horizontal align={'center'} className={className} flex={'none'} {...rest}>
      {logoComponent}
      <Divider size={extraSize} style={{ color: cssVar.colorFill }} />
      <div className={styles.extraTitle} style={{ fontSize: extraSize }}>
        {extra}
      </div>
    </Flexbox>
  );
});

export default CustomLogo;
