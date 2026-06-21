'use client';

import 'antd/dist/reset.css';

import { ConfigProvider, ThemeProvider } from '@lobehub/ui';
import { App } from 'antd';
import * as m from 'motion/react-m';
import { type PropsWithChildren, useCallback } from 'react';
import { memo } from 'react';

import AntdStaticMethods from '@/components/AntdStaticMethods';
import { useIsDark } from '@/hooks/useIsDark';
import Image from '@/libs/next/Image';
import Link from '@/libs/next/Link';

interface AuthThemeLiteProps extends PropsWithChildren {
  globalCDN?: boolean;
}

const AuthThemeLite = memo<AuthThemeLiteProps>(({ children, globalCDN }) => {
  const isDark = useIsDark();
  const currentAppearance = isDark ? 'dark' : 'light';

  // UGS-MODIFY: UGS-010b 精确覆盖 colorPrimary 为品牌色 #2563EB，与主应用 AppTheme 保持一致
  // customTheme.primaryColor 生成基础色阶 + CSS 变量，customToken 作为最后一层精确覆盖 hex 值
  const ugsciCustomToken = useCallback(() => ({ colorPrimary: '#2563EB' }), []);

  return (
    <ThemeProvider
      appearance={currentAppearance}
      className={'auth-layout'}
      customTheme={{ primaryColor: 'geekblue' }}
      customToken={ugsciCustomToken}
      defaultAppearance={currentAppearance}
      defaultThemeMode={currentAppearance}
      style={{ height: '100%' }}
      theme={{
        cssVar: { key: 'lobe-vars' },
      }}
    >
      <App style={{ height: '100%' }}>
        <AntdStaticMethods />
        <ConfigProvider
          motion={m}
          config={{
            aAs: Link,
            imgAs: Image,
            imgUnoptimized: true,
            proxy: globalCDN ? 'unpkg' : undefined,
          }}
        >
          {children}
        </ConfigProvider>
      </App>
    </ThemeProvider>
  );
});

AuthThemeLite.displayName = 'AuthThemeLite';

export default AuthThemeLite;
