'use client';

// UGS-MODIFY: email OTP verification code step
import { SignInEmailCodeStep } from './SignInEmailCodeStep';
import { SignInEmailSentStep } from './SignInEmailSentStep';
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
    handleBackFromSent,
    handleBackToEmail,
    handleCheckUser,
    handleForgotPassword,
    handleGoToSignup,
    handleResendEmail,
    handleSignIn,
    handlePasswordLogin,
    handleSocialSignIn,
    handleResetUserExists,
    userCheckStatus,
    userCheckLoading,
    isSocialOnly,
    lastAuthProvider,
    loading,
    oAuthSSOProviders,
    sending,
    sentInfo,
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

  if (step === 'emailSent' && sentInfo)
    return (
      <SignInEmailSentStep
        email={sentInfo.email}
        sending={sending}
        type={sentInfo.type}
        onBack={handleBackFromSent}
        onResend={handleResendEmail}
      />
    );

  if (step === 'password')
    return (
      <SignInPasswordStep
        email={email}
        forgotLoading={sending}
        form={form as any}
        loading={loading}
        onBackToEmail={handleBackToEmail}
        onForgotPassword={handleForgotPassword}
        onSubmit={handleSignIn}
      />
    );

  // UGS-MODIFY: unified email+password step (user existence check inline)
  return (
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
      userCheckLoading={userCheckLoading}
      userCheckStatus={userCheckStatus}
      onCheckUser={handleCheckUser}
      onGoToSignup={handleGoToSignup}
      onPasswordLogin={handlePasswordLogin}
      onResetEmail={handleBackToEmail}
      onResetUser={handleResetUserExists}
      onSendCode={handleSendEmailOtp}
      onSetPassword={handleForgotPassword}
      onSocialSignIn={handleSocialSignIn}
    />
  );
};

export default SignIn;
