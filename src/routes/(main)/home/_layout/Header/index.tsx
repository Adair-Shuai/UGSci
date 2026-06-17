'use client';

import { memo } from 'react';

import SideBarHeaderLayout from '@/features/NavPanel/SideBarHeaderLayout';

import InboxButton from './components/InboxButton';
import Nav from './components/Nav';

// UGS-MODIFY: UGS-010 move <User /> from header to footer (next to help icon)
// UGS-MODIFY: UGS-010b place UGSci text logo in the top-left corner
// UGS-MODIFY: UGS-010d 不传 left prop，走 breadcrumb 空数组路径 → 只渲染 UGSciLogo（与子菜单一致）
const Header = memo(() => {
  return (
    <>
      <SideBarHeaderLayout right={<InboxButton />} showBack={false} />
      <Nav />
    </>
  );
});

export default Header;
