import { BRANDING_NAME } from '@lobechat/business-const';
import { Alert, Button, Flexbox, Icon, Input, InputPassword, Skeleton, Text } from '@lobehub/ui';
import { type FormInstance, type InputRef } from 'antd';
import { Badge, Divider, Form } from 'antd';
import { createStaticStyles } from 'antd-style';
// UGS-MODIFY: email OTP — add MessageSquareCode icon for verification code button
import { Lock, Mail, MessageSquareCode } from 'lucide-react';
import { type CSSProperties, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import AuthIcons from '@/components/AuthIcons';
import AuthCard from '@/features/AuthCard';
import { AuthAgreement } from '@/features/AuthShell';

const styles = createStaticStyles(({ css, cssVar }) => ({
  setPasswordLink: css`
    cursor: pointer;
    color: ${cssVar.colorPrimary};
    text-decoration: underline;
  `,
}));

export const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
export const USERNAME_REGEX = /^\w+$/;

// Pin both the provider logo and the loading spinner to the same spot so the
// spinner doesn't jump when a social button enters its loading state.
const PROVIDER_ICON_STYLE: CSSProperties = { left: 12, position: 'absolute', top: 13 };

// Turn a provider id into a display name, e.g. "google" -> "Google".
const getProviderName = (provider: string) =>
  provider.toLowerCase().replaceAll(/(^|[_-])([a-z])/g, (_, __, c) => c.toUpperCase());

export interface SignInEmailStepProps {
  codeLoading: boolean;
  disableEmailPassword?: boolean;
  form: FormInstance<{ email: string }>;
  isSocialOnly: boolean;
  lastAuthProvider?: string | null;
  loading: boolean;
  oAuthSSOProviders: string[];
  onCheckUser: (values: { email: string }) => Promise<void>;
  onPasswordLogin: (password: string) => Promise<void>;
  onResetUser: () => void;
  onSendCode: (email: string) => Promise<void>;
  onSetPassword: () => void;
  onSocialSignIn: (provider: string) => void;
  serverConfigInit: boolean;
  socialLoading: string | null;
  userCheckLoading: boolean;
  userCheckStatus: 'unchecked' | 'exists' | 'exists_no_password' | 'not_found';
}

export const SignInEmailStep = ({
  disableEmailPassword,
  form,
  isSocialOnly,
  lastAuthProvider,
  loading,
  userCheckLoading,
  userCheckStatus,
  oAuthSSOProviders,
  serverConfigInit,
  socialLoading,
  codeLoading,
  onCheckUser,
  onPasswordLogin,
  onResetUser,
  onSendCode,
  onSetPassword,
  onSocialSignIn,
}: SignInEmailStepProps) => {
  const { t } = useTranslation('auth');
  const emailInputRef = useRef<InputRef>(null);
  const passwordInputRef = useRef<any>(null);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // UGS-MODIFY: auto-check user on email blur
  const handleEmailBlur = () => {
    const emailValue = form.getFieldValue('email')?.trim();
    if (!emailValue) return;
    if (EMAIL_REGEX.test(emailValue) || USERNAME_REGEX.test(emailValue)) {
      onCheckUser({ email: emailValue });
    }
  };

  // UGS-MODIFY: when userCheckStatus becomes "exists", focus password field
  useEffect(() => {
    if (userCheckStatus === 'exists' && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [userCheckStatus]);

  const handlePasswordSubmit = () => {
    const passwordValue = form.getFieldValue('password');
    if (passwordValue) {
      onPasswordLogin(passwordValue);
    }
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userCheckStatus === 'exists') {
      passwordInputRef.current?.focus();
    }
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePasswordSubmit();
    }
  };

  const divider = (
    <Divider>
      <Text fontSize={12} type={'secondary'}>
        {t('betterAuth.signin.orContinueWith')}
      </Text>
    </Divider>
  );

  const getProviderLabel = (provider: string) => {
    const normalized = getProviderName(provider);
    const normalizedKey = normalized.replaceAll(/[^\da-z]/gi, '');
    const key = `betterAuth.signin.continueWith${normalizedKey}`;
    return t(key, { defaultValue: `Continue with ${normalized}` });
  };

  return (
    <AuthCard title={t('signin.subtitle', { appName: BRANDING_NAME })}>
      {!serverConfigInit && (
        <Flexbox gap={12}>
          <Skeleton.Button active block size="large" />
          <Skeleton.Button active block size="large" />
          {divider}
        </Flexbox>
      )}
      {serverConfigInit && oAuthSSOProviders.length > 0 && (
        <Flexbox gap={12}>
          {oAuthSSOProviders.map((provider) => {
            const button = (
              <Button
                block
                icon={<Icon icon={AuthIcons(provider, 18)} style={PROVIDER_ICON_STYLE} />}
                iconProps={{ size: 18, style: PROVIDER_ICON_STYLE }}
                key={provider}
                loading={socialLoading === provider}
                size="large"
                onClick={() => onSocialSignIn(provider)}
              >
                {getProviderLabel(provider)}
              </Button>
            );
            const showLastUsed =
              provider === lastAuthProvider &&
              (oAuthSSOProviders.length > 1 ||
                (oAuthSSOProviders.length === 1 && !disableEmailPassword));
            return showLastUsed ? (
              <Badge
                color="var(--ant-color-info)"
                count={t('betterAuth.signin.lastUsed')}
                key={provider}
                styles={{ root: { display: 'block', width: '100%' } }}
              >
                {button}
              </Badge>
            ) : (
              button
            );
          })}
          {!disableEmailPassword && divider}
        </Flexbox>
      )}
      {serverConfigInit && disableEmailPassword && oAuthSSOProviders.length === 0 && (
        <Alert showIcon description={t('betterAuth.signin.ssoOnlyNoProviders')} type="warning" />
      )}
      {!disableEmailPassword && (
        <Form
          form={form}
          layout="vertical"
          onFinish={() => {
            if (userCheckStatus === 'exists') {
              handlePasswordSubmit();
            } else if (userCheckStatus === 'unchecked') {
              const emailValue = form.getFieldValue('email');
              if (emailValue) onCheckUser({ email: emailValue });
            } else {
              // exists_no_password or not_found → send OTP directly
              const emailValue = form.getFieldValue('email');
              if (emailValue) onSendCode(emailValue);
            }
          }}
        >
          <Form.Item
            name="email"
            style={{ marginBottom: 12 }}
            rules={[
              { message: t('betterAuth.errors.emailRequired'), required: true },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const trimmedValue = (value as string).trim();
                  if (EMAIL_REGEX.test(trimmedValue) || USERNAME_REGEX.test(trimmedValue)) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('betterAuth.errors.emailInvalid')));
                },
              },
            ]}
          >
            <Input
              placeholder={t('betterAuth.signin.emailPlaceholder')}
              ref={emailInputRef}
              size="large"
              prefix={
                <Icon
                  icon={Mail}
                  style={{
                    marginInline: 6,
                  }}
                />
              }
              style={{
                padding: 6,
              }}
            />
          </Form.Item>
          {/* UGS-MODIFY: password input, shown only when user exists */}
          {userCheckStatus === 'exists' && (
            <>
              <Form.Item
                name="password"
                style={{ marginBottom: 12 }}
                rules={[
                  { message: t('betterAuth.errors.passwordRequired'), required: true },
                ]}
              >
                <InputPassword
                  placeholder={t('betterAuth.signin.passwordPlaceholder')}
                  ref={passwordInputRef}
                  size="large"
                  style={{ padding: 6 }}
                  prefix={
                    <Icon
                      icon={Lock}
                      style={{ marginInline: 6 }}
                    />
                  }
                  onKeyDown={handlePasswordKeyDown}
                />
              </Form.Item>
              <Flexbox justify="flex-end" style={{ marginBottom: 12 }}>
                <Button size="small" type="link" onClick={onSetPassword}>
                  {t('betterAuth.signin.forgotPassword')}
                </Button>
              </Flexbox>
            </>
          )}
          {/* UGS-MODIFY: unified auth buttons */}
          <Flexbox gap={8}>
            <Button block disabled={codeLoading} htmlType="submit" loading={loading || userCheckLoading || codeLoading} size="large" type="primary">
              {userCheckStatus === 'unchecked'
                ? t('ugs.signin.checkUser', { defaultValue: '下一步' })
                : userCheckStatus === 'exists'
                  ? t('ugs.signin.passwordLogin', { defaultValue: '密码登录' })
                  : t('ugs.signin.codeLoginRegister', { defaultValue: '验证码登录/注册' })}
            </Button>
            <Button
              block
              disabled={codeLoading}
              icon={<Icon icon={MessageSquareCode} />}
              loading={codeLoading}
              size="large"
              onClick={() => {
                const emailValue = form.getFieldValue('email');
                if (!emailValue) {
                  form
                    .validateFields(['email'])
                    .then(() => {
                      onSendCode(form.getFieldValue('email'));
                    })
                    .catch(() => {});
                  return;
                }
                onSendCode(emailValue);
              }}
            >
              {t('ugs.signin.codeLoginRegister', { defaultValue: '验证码登录/注册' })}
            </Button>
          </Flexbox>

          {/* User status hint - different messages based on check result */}
          {(userCheckStatus === 'exists_no_password' || userCheckStatus === 'not_found') && (
            <Flexbox style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)', textAlign: 'center' }}>
                {userCheckStatus === 'not_found'
                  ? t('ugs.emailCode.newUserHint', { defaultValue: '该邮箱未注册，点击验证码登录/注册将自动注册' })
                  : t('ugs.emailCode.noPasswordHint', { defaultValue: '该邮箱尚未设置密码，请使用验证码登录后设置' })}
              </div>
            </Flexbox>
          )}
        </Form>
      )}
      {isSocialOnly && (
        <Alert
          showIcon
          style={{ marginTop: 12 }}
          type="info"
          description={
            <>
              {t('betterAuth.signin.socialOnlyHint')}{' '}
              <a className={styles.setPasswordLink} onClick={onSetPassword}>
                {t('betterAuth.signin.setPassword')}
              </a>
            </>
          }
        />
      )}
      <AuthAgreement />
    </AuthCard>
  );
};
