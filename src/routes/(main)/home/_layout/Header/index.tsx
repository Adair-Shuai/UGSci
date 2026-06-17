'use client';

import { memo } from 'react';

import SideBarHeaderLayout from '@/features/NavPanel/SideBarHeaderLayout';

import InboxButton from './components/InboxButton';
import Nav from './components/Nav';

// UGS-MODIFY: UGS-010 move <User /> from header to footer (next to help icon)
const Header = memo(() => {
  return (
    <>
      <SideBarHeaderLayout right={<InboxButton />} showBack={false} />
      <Nav />
    </>
  );
});

export default Header;
