import { ENABLE_BUSINESS_FEATURES } from '@lobechat/business-const';
import { Form } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { CheckUserResponseData } from '@/app/(backend)/api/auth/check-user/route';
import type { ResolveUsernameResponseData } from '@/app/(backend)/api/auth/resolve-username/route';
import { useBusinessSignin } from '@/business/client/hooks/useBusinessSignin';
import { message } from '@/components/AntdStaticMethods';
import { useAuthServerConfigStore } from '@/features/AuthShell';
import { trackLoginOrSignupClicked } from '@/features/User/UserLoginOrSignup/trackLoginOrSignupClicked';
import {
  emailOtp,
  phoneNumber,
  requestPasswordReset,
  signIn,
} from '@/libs/better-auth/auth-client';
import { isBuiltinProvider, normalizeProviderId } from '@/libs/better-auth/utils/client';
import { buildOnboardingRedirectUrl, sanitizeRedirectPath } from '@/utils/onboardingRedirect';

import { EMAIL_REGEX, USERNAME_REGEX } from './SignInEmailStep';

const LAST_AUTH_PROVIDER_KEY = 'ugsci:auth:last-provider:v1';

type Step = 'email' | 'password' | 'emailCode';
// UGS-MODIFY: UGS-005 add phone sign-in mode
type SignInMode = 'phone' | 'email';

interface SignInFormValues {
  email: string;
  password: string;
}

interface ResolvedEmailResult {
  email: string;
  identifierType: 'email' | 'username';
}

export const useSignIn = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const enableMagicLink = useAuthServerConfigStore((s) => s.serverConfig.enableMagicLink || false);
  const disableEmailPassword = useAuthServerConfigStore(
    (s) => s.serverConfig.disableEmailPassword || false,
  );
  const [form] = Form.useForm<SignInFormValues>();
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [isSocialOnly, setIsSocialOnly] = useState(false);
  type UserCheckStatus = 'unchecked' | 'exists' | 'exists_no_password' | 'not_found';
  const [userCheckStatus, setUserCheckStatus] = useState<UserCheckStatus>('unchecked');
  const [userCheckLoading, setUserCheckLoading] = useState(false);
  // UGS-MODIFY: UGS-005 phone sign-in state (default to 'email', phone code retained for future)
  const [mode, setMode] = useState<SignInMode>('email');
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [lastAuthProvider] = useState(() => {
    try {
      return localStorage.getItem(LAST_AUTH_PROVIDER_KEY);
    } catch {
      return null;
    }
  });
  const serverConfigInit = useAuthServerConfigStore((s) => s.serverConfigInit);
  const oAuthSSOProviders = useAuthServerConfigStore((s) => s.serverConfig.oAuthSSOProviders) || [];
  const { getAdditionalData, preSocialSigninCheck, ssoProviders } = useBusinessSignin();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) form.setFieldValue('email', emailParam);
  }, [searchParams, form]);

  // UGS-MODIFY: UGS-005 OTP countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendMagicLink = async (targetEmail?: string) => {
    try {
      const emailValue =
        targetEmail ||
        (await form
          .validateFields(['email'])
          .then((v) => v.email as string)
          .catch(() => null));
      if (!emailValue) return;

      const callbackUrl = searchParams.get('callbackUrl') || '/';
      const { error } = await signIn.magicLink({
        callbackURL: callbackUrl,
        email: emailValue,
        // First-time magic-link users are signups — land them on onboarding first
        newUserCallbackURL: buildOnboardingRedirectUrl(callbackUrl),
      });
      if (error) {
        message.error(error.message || t('betterAuth.signin.magicLinkError'));
        return;
      }
      message.success(t('betterAuth.signin.magicLinkSent'));
    } catch (error) {
      if (!(error as any)?.errorFields) {
        console.error('Magic link error:', error);
        message.error(t('betterAuth.signin.magicLinkError'));
      }
    }
  };

  const resolveEmailFromIdentifier = async (
    identifier: string,
  ): Promise<ResolvedEmailResult | null> => {
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) return null;

    const isEmailIdentifier = EMAIL_REGEX.test(trimmedIdentifier);
    if (isEmailIdentifier)
      return { email: trimmedIdentifier.toLowerCase(), identifierType: 'email' };

    if (!USERNAME_REGEX.test(trimmedIdentifier)) {
      message.error(t('betterAuth.errors.emailInvalid'));
      return null;
    }

    try {
      const response = await fetch('/api/auth/resolve-username', {
        body: JSON.stringify({ username: trimmedIdentifier }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data: ResolveUsernameResponseData = await response.json();
      if (!response.ok || !data.exists || !data.email) {
        message.error(t('betterAuth.errors.usernameNotRegistered'));
        return null;
      }
      return { email: data.email, identifierType: 'username' };
    } catch (error) {
      console.error('Error resolving username:', error);
      message.error(t('betterAuth.signin.error'));
      return null;
    }
  };

  const handleCheckUser = async (values: Pick<SignInFormValues, 'email'>) => {
    setUserCheckLoading(true);
    await trackLoginOrSignupClicked({ spm: 'signin.email_step.submit' });

    try {
      const resolvedEmail = await resolveEmailFromIdentifier(values.email);
      if (!resolvedEmail) return;

      const { email: targetEmail, identifierType } = resolvedEmail;
      const response = await fetch('/api/auth/check-user', {
        body: JSON.stringify({ email: targetEmail }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data: CheckUserResponseData = await response.json();

      if (identifierType === 'username' && !data.exists) {
        message.error(t('betterAuth.errors.usernameNotRegistered'));
        return;
      }

      setEmail(targetEmail);
      if (!data.exists) {
        setUserCheckStatus('not_found');
      } else if (!data.hasPassword) {
        setUserCheckStatus('exists_no_password');
      } else {
        setUserCheckStatus('exists');
      }
    } catch (error) {
      console.error('Error checking user:', error);
      message.error(t('betterAuth.signin.error'));
    } finally {
      setUserCheckLoading(false);
    }
  };

  const handleSignIn = async (values: Pick<SignInFormValues, 'password'>) => {
    setLoading(true);
    await trackLoginOrSignupClicked({ spm: 'signin.password_step.submit' });

    try {
      const callbackUrl = searchParams.get('callbackUrl') || '/';
      message.loading({
        content: t('betterAuth.signin.signingIn', { defaultValue: '正在登录...' }),
        duration: 0,
      });
      const result = await signIn.email(
        { callbackURL: callbackUrl, email, password: values.password },
        {
          onError: (ctx) => {
            console.error('Sign in error:', ctx.error);
            message.destroy();
            if (ctx.error.status === 403) {
              navigate(
                `/verify-email?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
              );
            }
          },
          // callbackUrl targets the main app, outside this auth SPA — full page load required
          onSuccess: () => {
            message.destroy();
            window.location.href = sanitizeRedirectPath(callbackUrl);
          },
        },
      );

      if (result.error && result.error.status !== 403) {
        message.error(result.error.message || t('betterAuth.signin.error'));
      }
    } catch (error) {
      console.error('Sign in error:', error);
      message.error(t('betterAuth.signin.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: string) => {
    setSocialLoading(provider);
    const normalizedProvider = normalizeProviderId(provider);
    await trackLoginOrSignupClicked({
      provider: normalizedProvider,
      spm: 'signin.social.click',
    });

    try {
      if (ENABLE_BUSINESS_FEATURES && !(await preSocialSigninCheck())) {
        setSocialLoading(null);
        return;
      }

      try {
        localStorage.setItem(LAST_AUTH_PROVIDER_KEY, provider);
      } catch {
        // Ignore localStorage errors (e.g., quota exceeded, private mode)
      }

      const callbackUrl = searchParams.get('callbackUrl') || '/';
      // First-time OAuth users are signups — land them on onboarding first
      const newUserCallbackURL = buildOnboardingRedirectUrl(callbackUrl);
      const additionalData = await getAdditionalData();
      const signInWithAdditionalData = async () =>
        isBuiltinProvider(normalizedProvider)
          ? await signIn.social({
              additionalData,
              callbackURL: callbackUrl,
              newUserCallbackURL,
              provider: normalizedProvider,
            })
          : await signIn.oauth2({
              additionalData,
              callbackURL: callbackUrl,
              newUserCallbackURL,
              providerId: normalizedProvider,
            });

      const result = await signInWithAdditionalData();

      if (result && 'error' in result && result.error) throw result.error;
    } catch (error) {
      console.error(`${normalizedProvider} sign in error:`, error);
      message.error(t('betterAuth.signin.socialError'));
    } finally {
      setSocialLoading(null);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setEmail('');
    setIsSocialOnly(false);
  };

  const handleGoToSignup = () => {
    const currentEmail = form.getFieldValue('email');
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    const params = new URLSearchParams();
    if (currentEmail) params.set('email', currentEmail);
    params.set('callbackUrl', callbackUrl);
    const utmSource = searchParams.get('utm_source');
    if (utmSource) params.set('utm_source', utmSource);
    const referral = searchParams.get('referral');
    if (referral) params.set('referral', referral);
    void trackLoginOrSignupClicked({ spm: 'signin.go_to_signup.click' }).finally(() => {
      navigate(`/signup?${params.toString()}`);
    });
  };

  const handleForgotPassword = async () => {
    try {
      await requestPasswordReset({
        email,
        redirectTo: `/reset-password?email=${encodeURIComponent(email)}`,
      });
      message.success(t('betterAuth.signin.forgotPasswordSent'));
    } catch {
      message.error(t('betterAuth.signin.forgotPasswordError'));
    }
  };

  // UGS-MODIFY: UGS-005 phone OTP send & verify
  const handleSendOtp = async (phone: string) => {
    setOtpSending(true);
    try {
      const { error } = await phoneNumber.sendOtp({ phoneNumber: phone.trim() });
      if (error) {
        message.error(
          error.message || t('ugs.phoneSignin.sendError', { defaultValue: '验证码发送失败' }),
        );
        return;
      }
      setOtpSent(true);
      setCountdown(60);
      message.success(
        t('ugs.phoneSignin.sent', { defaultValue: '验证码已发送，开发模式请查看服务端控制台' }),
      );
    } catch (error) {
      console.error('Send OTP error:', error);
      message.error(t('ugs.phoneSignin.sendError', { defaultValue: '验证码发送失败' }));
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (code: string, phone: string) => {
    setLoading(true);
    try {
      const callbackUrl = searchParams.get('callbackUrl') || '/';
      const { error } = await phoneNumber.verify({
        code,
        phoneNumber: phone.trim(),
      });
      if (error) {
        message.error(
          error.message || t('ugs.phoneSignin.verifyError', { defaultValue: '验证失败' }),
        );
        return;
      }
      window.location.href = sanitizeRedirectPath(callbackUrl);
    } catch (error) {
      console.error('Verify OTP error:', error);
      message.error(t('ugs.phoneSignin.verifyError', { defaultValue: '验证失败' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToEmail = () => {
    setMode('email');
    setOtpSent(false);
  };

  const handleSwitchToPhone = () => {
    setMode('phone');
    setStep('email');
    setIsSocialOnly(false);
  };

  // UGS-MODIFY: email OTP sign-in
  const [emailOtpSending, setEmailOtpSending] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(0);
  // UGS-MODIFY: track whether user has password (determines post-OTP redirect)
  const [isNewUserNoPassword, setIsNewUserNoPassword] = useState(false);

  // UGS-MODIFY: email OTP countdown timer
  useEffect(() => {
    if (emailCountdown <= 0) return;
    const timer = setTimeout(() => setEmailCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [emailCountdown]);

  const handleSendEmailOtp = async (targetEmail?: string) => {
    setEmailOtpSending(true);
    try {
      const emailValue =
        targetEmail ||
        (await form
          .validateFields(['email'])
          .then((v) => v.email as string)
          .catch(() => null));
      if (!emailValue) return;

      // UGS-MODIFY: Check if user has password before sending OTP
      const resolvedEmail = await resolveEmailFromIdentifier(emailValue);
      if (resolvedEmail) {
        const checkResponse = await fetch('/api/auth/check-user', {
          body: JSON.stringify({ email: resolvedEmail.email }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
        const checkData = await checkResponse.json();
        // UGS-MODIFY: New user or existing user without password → redirect to set-password after OTP
        setIsNewUserNoPassword(!checkData.exists || !checkData.hasPassword);
      }

      const { error } = await emailOtp.sendVerificationOtp({ email: emailValue, type: 'sign-in' });
      if (error) {
        message.error(
          error.message || t('ugs.emailCode.sendError', { defaultValue: '验证码发送失败' }),
        );
        return;
      }
      setEmailOtpSent(true);
      setEmailCountdown(60);
      setEmail(emailValue.toLowerCase());
      setStep('emailCode');
      message.success(t('ugs.emailCode.sent', { defaultValue: '验证码已发送，请查收邮件' }));
    } catch (error) {
      console.error('Send email OTP error:', error);
      message.error(t('ugs.emailCode.sendError', { defaultValue: '验证码发送失败' }));
    } finally {
      setEmailOtpSending(false);
    }
  };

  const handleVerifyEmailOtp = async (code: string) => {
    setLoading(true);
    try {
      const callbackUrl = searchParams.get('callbackUrl') || '/';
      let signInSuccess = false;
      const result = await signIn.emailOtp(
        {
          email,
          otp: code,
        },
        {
          onError: (ctx) => {
            console.error('Email OTP sign in error:', ctx.error);
            if (ctx.error.status === 403) {
              navigate(
                `/verify-email?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
              );
            } else {
              message.error(
                ctx.error.message || t('ugs.emailCode.verifyError', { defaultValue: '验证失败' }),
              );
            }
          },
          onSuccess: () => {
            signInSuccess = true;
          },
        },
      );
      if (signInSuccess) {
        // Exchange better-auth session for OIDC token (desktop only, best-effort)
        try {
          const exchangeRes = await fetch('/api/auth/exchange', { method: 'POST' });
          if (exchangeRes.ok) {
            const { access_token, expires_in } = await exchangeRes.json();
            const { remoteServerService } = await import('@/services/electron/remoteServer');
            await remoteServerService.saveAuthToken({
              accessToken: access_token,
              expiresIn: expires_in,
            });
          }
        } catch {
          // Non-critical: web environment or API not available
        }
        if (isNewUserNoPassword) {
          window.location.href = '/set-password';
        } else {
          window.location.href = sanitizeRedirectPath(callbackUrl);
        }
      } else if (result.error && result.error.status !== 403) {
        message.error(
          result.error.message || t('ugs.emailCode.verifyError', { defaultValue: '验证失败' }),
        );
      }
    } catch (error) {
      console.error('Verify email OTP error:', error);
      message.error(t('ugs.emailCode.verifyError', { defaultValue: '验证失败' }));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmailFromCode = () => {
    setStep('email');
    setEmailOtpSent(false);
    setIsNewUserNoPassword(false);
  };

  const resolvedProviders = ENABLE_BUSINESS_FEATURES ? ssoProviders : oAuthSSOProviders;
  const sortedProviders = lastAuthProvider
    ? [...resolvedProviders].sort((a, b) => {
        if (a === lastAuthProvider) return -1;
        if (b === lastAuthProvider) return 1;
        return 0;
      })
    : resolvedProviders;

  return {
    disableEmailPassword,
    email,
    form,
    handleBackToEmail,
    handleCheckUser,
    handleForgotPassword,
    handleGoToSignup,
    handleSignIn,
    handlePasswordLogin,
    handleSocialSignIn,
    handleResetUserExists,
    userCheckStatus,
    userCheckLoading,
    isSocialOnly,
    lastAuthProvider,
    loading,
    oAuthSSOProviders: sortedProviders,
    serverConfigInit: ENABLE_BUSINESS_FEATURES ? true : serverConfigInit,
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
    // UGS-MODIFY: email OTP sign-in
    emailOtpSending,
    emailOtpSent,
    emailCountdown,
    handleSendEmailOtp,
    handleVerifyEmailOtp,
    handleBackToEmailFromCode,
  };
};
// UGS-MODIFY: password login from the unified email+password page
const handlePasswordLogin = async (password: string) => {
  if (!email) return;
  if (userCheckStatus !== 'exists') {
    message.error(t('betterAuth.signin.error'));
    return;
  }
  setLoading(true);
  await trackLoginOrSignupClicked({ spm: 'signin.password_step.submit' });

  try {
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    message.loading({
      content: t('betterAuth.signin.signingIn', { defaultValue: '正在登录...' }),
      duration: 0,
    });
    const result = await signIn.email(
      { callbackURL: callbackUrl, email, password },
      {
        onError: (ctx) => {
          console.error('Sign in error:', ctx.error);
          message.destroy();
          if (ctx.error.status === 403) {
            navigate(
              `/verify-email?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
            );
          }
        },
        onSuccess: () => {
          message.destroy();
          window.location.href = sanitizeRedirectPath(callbackUrl);
        },
      },
    );

    if (result.error && result.error.status !== 403) {
      message.error(result.error.message || t('betterAuth.signin.error'));
    }
  } catch (error) {
    console.error('Sign in error:', error);
    message.error(t('betterAuth.signin.error'));
  } finally {
    setLoading(false);
  }
};

const handleResetUserExists = () => {
  setUserCheckStatus('unchecked');
  setEmail('');
  setIsSocialOnly(false);
};
