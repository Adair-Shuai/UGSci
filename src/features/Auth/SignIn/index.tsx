'use client';

// UGS-MODIFY: email OTP verification code step
import { SignInEmailCodeStep } from './SignInEmailCodeStep';
import { SignInEmailStep } from './SignInEmailStep';
import { SignInPasswordStep } from './SignInPasswordStep';
// UGS-MODIFY: UGS-005 phone sign-in step (code retained, default mode is now 'email')
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
    // UGS-MODIFY: email OTP sign-in
    emailOtpSending,
    emailCountdown,
    handleSendEmailOtp,
    handleVerifyEmailOtp,
    handleBackToEmailFromCode,
  } = useSignIn();

  // UGS-MODIFY: UGS-005 phone sign-in mode disabled (default 'email'), code retained
  if (mode === 'phone') {
    return (
      <SignInPhoneStep
        countdown={countdown}
        loading={loading}
        otpSending={otpSending}
        otpSent={otpSent}
        onSendOtp={handleSendOtp}
        onSwitchToEmail={handleSwitchToEmail}
        onVerify={handleVerifyOtp}
      />
    );
  }

  // UGS-MODIFY: email OTP verification code step
  if (step === 'emailCode') {
    return (
      <SignInEmailCodeStep
        countdown={emailCountdown}
        email={email}
        loading={loading}
        otpSending={emailOtpSending}
        onBack={handleBackToEmailFromCode}
        onResend={handleSendEmailOtp}
        onVerify={handleVerifyEmailOtp}
      />
    );
  }

  return step === 'email' ? (
    <SignInEmailStep
      codeLoading={emailOtpSending}
      disableEmailPassword={disableEmailPassword}
      form={form as any}
      isSocialOnly={isSocialOnly}
      lastAuthProvider={lastAuthProvider}
      loading={loading}
      oAuthSSOProviders={oAuthSSOProviders}
      serverConfigInit={serverConfigInit}
      socialLoading={socialLoading}
      onCheckUser={handleCheckUser}
      onSendCode={handleSendEmailOtp}
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
