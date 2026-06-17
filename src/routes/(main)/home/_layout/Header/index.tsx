'use client';

import { memo } from 'react';

import SideBarHeaderLayout from '@/features/NavPanel/SideBarHeaderLayout';

import InboxButton from './components/InboxButton';
import Nav from './components/Nav';
import UGSciLogo from './components/UGSciLogo';

// UGS-MODIFY: UGS-010 move <User /> from header to footer (next to help icon)
// UGS-MODIFY: UGS-010b place UGSci text logo in the top-left corner
const Header = memo(() => {
  return (
    <>
      <SideBarHeaderLayout left={<UGSciLogo size={28} />} right={<InboxButton />} showBack={false} />
      <Nav />
    </>
  );
});

export default Header;
