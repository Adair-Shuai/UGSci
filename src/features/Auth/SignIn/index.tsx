'use client';

import { SignInEmailStep } from './SignInEmailStep';
import { SignInPasswordStep } from './SignInPasswordStep';
// UGS-MODIFY: UGS-005 phone sign-in step
import { SignInPhoneStep } from './SignInPhoneStep';
import { useSignIn } from './useSignIn';

const SignIn = () => {
  const {
    disableEmailPassword,
    email,
    form,
    handleBackToEmail,
    handleCheckUser,
    handleForgotPassword,
    handleSignIn,
    handleSocialSignIn,
    isSocialOnly,
    lastAuthProvider,
    loading,
    oAuthSSOProviders,
    serverConfigInit,
    socialLoading,
    step,
    // UGS-MODIFY: UGS-005 phone sign-in
    mode,
    otpSending,
    otpSent,
    countdown,
    handleSendOtp,
    handleVerifyOtp,
    handleSwitchToEmail,
    handleSwitchToPhone,
  } = useSignIn();

  // UGS-MODIFY: UGS-005 default to phone sign-in mode
  if (mode === 'phone') {
    return (
      <SignInPhoneStep
        countdown={countdown}
        loading={loading}
        onSendOtp={handleSendOtp}
        onSwitchToEmail={handleSwitchToEmail}
        onVerify={handleVerifyOtp}
        otpSent={otpSent}
        otpSending={otpSending}
      />
    );
  }

  return step === 'email' ? (
    <SignInEmailStep
      disableEmailPassword={disableEmailPassword}
      form={form as any}
      isSocialOnly={isSocialOnly}
      lastAuthProvider={lastAuthProvider}
      loading={loading}
      oAuthSSOProviders={oAuthSSOProviders}
      serverConfigInit={serverConfigInit}
      socialLoading={socialLoading}
      onCheckUser={handleCheckUser}
      onSetPassword={handleForgotPassword}
      onSocialSignIn={handleSocialSignIn}
    />
  ) : (
    <SignInPasswordStep
      email={email}
      form={form as any}
      loading={loading}
      onBackToEmail={handleBackToEmail}
      onForgotPassword={handleForgotPassword}
      onSubmit={handleSignIn}
    />
  );
};

export default SignIn;
