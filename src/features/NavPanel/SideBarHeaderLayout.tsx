'use client';

import { Flexbox, Icon, Text } from '@lobehub/ui';
import type { BreadcrumbProps } from 'antd';
import { Breadcrumb } from 'antd';
import { createStaticStyles, cssVar } from 'antd-style';
import { ChevronRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { memo } from 'react';
import { flushSync } from 'react-dom';

import { UGSciLogo } from '@/components/Branding';
import { DESKTOP_HEADER_ICON_SMALL_SIZE } from '@/const/layoutTokens';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { isModifierClick } from '@/utils/navigation';

import BackButton from './components/BackButton';
import ToggleLeftPanelButton from './ToggleLeftPanelButton';

const prefixCls = 'ant';

const styles = createStaticStyles(({ css, cssVar }) => ({
  breadcrumb: css`
    ol {
      align-items: center;
    }
    .${prefixCls}-breadcrumb-separator {
      margin-inline: 4px;
    }
    .${prefixCls}-breadcrumb-link {
      display: flex !important;
      align-items: center !important;
      font-size: 12px;
      color: ${cssVar.colorTextDescription};
    }
    a.${prefixCls}-breadcrumb-link {
      &:hover {
        color: ${cssVar.colorText};
      }
    }
  `,
  container: css`
    overflow: hidden;
  `,
}));

type BreadcrumbItem = NonNullable<BreadcrumbProps['items']>[number];

interface SideBarHeaderLayoutProps {
  backTo?: string;
  breadcrumb?: BreadcrumbProps['items'];
  /** Override the leading home breadcrumb item (defaults to home icon → `/`). */
  homeItem?: BreadcrumbItem;
  left?: ReactNode;
  right?: ReactNode;
  showBack?: boolean;
  showTogglePanelButton?: boolean;
}

const SideBarHeaderLayout = memo<SideBarHeaderLayoutProps>(
  ({
    left,
    right,
    backTo = '/',
    showBack = true,
    breadcrumb = [],
    homeItem,
    showTogglePanelButton = true,
  }) => {
    const navigate = useWorkspaceAwareNavigate();
    // UGS-MODIFY: UGS-010d 统一所有页面左上角显示 UGSci Logo（首页和二级菜单一致）
    // 不再走 antd Breadcrumb 包裹（breadcrumb-link 的 colorTextDescription 会覆盖 Logo 的 colorText，
    // 且 paddingInline=6 造成位置偏移）。改为：始终在 Flexbox 内直接渲染 UGSciLogo，后接分隔符+面包屑文本。
    const logoNode = <UGSciLogo size={28} />;

    // 渲染非首页的面包屑条目（不含 home 项，home 由 logoNode 替代）
    const breadcrumbNodes =
      breadcrumb && breadcrumb.length > 0 ? (
        <>
          <Icon color={cssVar.colorTextDescription} icon={ChevronRightIcon} size={14} />
          <Breadcrumb
            className={styles.breadcrumb}
            items={breadcrumb.map((item) => ({
              ...item,
              onClick: (event) => {
                if (isModifierClick(event)) return;
                const href = item.href;
                if (href) {
                  event.preventDefault();
                  event.stopPropagation();
                  // eslint-disable-next-line @eslint-react/dom/no-flush-sync
                  flushSync(() => navigate(href));
                }
              },
            }))}
          />
        </>
      ) : null;

    const leftContent = (
      <Flexbox
        horizontal
        align={'center'}
        flex={1}
        gap={4}
        style={{
          overflow: 'hidden',
          paddingInline: 2,
        }}
      >
        {showBack && <BackButton size={DESKTOP_HEADER_ICON_SMALL_SIZE} to={backTo} />}
        {left ? (
          typeof left === 'string' ? (
            <Text ellipsis fontSize={16} weight={500}>
              {left}
            </Text>
          ) : (
            left
          )
        ) : (
          <>
            {logoNode}
            {breadcrumbNodes}
          </>
        )}
      </Flexbox>
    );

    return (
      <Flexbox
        horizontal
        align={'center'}
        className={styles.container}
        flex={'none'}
        justify={'space-between'}
        padding={'8px 6px'}
      >
        {leftContent}
        <Flexbox horizontal align={'center'} gap={2} justify={'flex-end'}>
          {showTogglePanelButton && <ToggleLeftPanelButton />}
          {right}
        </Flexbox>
      </Flexbox>
    );
  },
);

export default SideBarHeaderLayout;
