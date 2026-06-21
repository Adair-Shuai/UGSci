// UGS-MODIFY: signup now handled via email verification code on signin page
// All new users go through signin → verification code flow for account creation
// This page redirects to /signin with email parameter preserved

'use client';

import { Navigate, useSearchParams } from 'react-router-dom';

import { useAuthServerConfigStore } from '@/features/AuthShell';

const SignUp = () => {
  const disableEmailPassword = useAuthServerConfigStore(
    (s) => s.serverConfig.disableEmailPassword || false,
  );
  const [searchParams] = useSearchParams();

  if (disableEmailPassword) return <Navigate replace to="/signin" />;

  // Preserve email and callbackUrl params when redirecting to signin
  const email = searchParams.get('email');
  const callbackUrl = searchParams.get('callbackUrl');
  const params = new URLSearchParams();
  if (email) params.set('email', email);
  if (callbackUrl) params.set('callbackUrl', callbackUrl);

  const signinUrl = `/signin${params.toString() ? `?${params.toString()}` : ''}`;
  return <Navigate replace to={signinUrl} />;
};

export default SignUp;
