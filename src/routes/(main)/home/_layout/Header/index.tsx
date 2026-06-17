'use client';

import { memo } from 'react';

import { ProductLogo } from '@/components/Branding';
import SideBarHeaderLayout from '@/features/NavPanel/SideBarHeaderLayout';

import InboxButton from './components/InboxButton';
import Nav from './components/Nav';

// UGS-MODIFY: UGS-010 move <User /> from header to footer (next to help icon)
// UGS-MODIFY: UGS-010b place UGSci product logo in the top-left corner (former User slot)
const Header = memo(() => {
  return (
    <>
      <SideBarHeaderLayout
        left={<ProductLogo size={28} type={'text'} />}
        right={<InboxButton />}
        showBack={false}
      />
      <Nav />
    </>
  );
});

export default Header;
