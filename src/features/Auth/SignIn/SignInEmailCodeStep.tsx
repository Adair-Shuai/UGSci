// UGS-MODIFY: email OTP verification code sign-in step
import { Button, Flexbox, Input, Text } from '@lobehub/ui';
import { Form } from 'antd';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import AuthCard from '@/features/AuthCard';
import { AuthAgreement } from '@/features/AuthShell';

export interface SignInEmailCodeStepProps {
  countdown: number;
  email: string;
  loading: boolean;
  onBack: () => void;
  onResend: (email: string) => Promise<void>;
  onVerify: (code: string) => Promise<void>;
  otpSending: boolean;
}

interface CodeFormValues {
  code: string;
}

export const SignInEmailCodeStep = ({
  email,
  loading,
  otpSending,
  countdown,
  onResend,
  onVerify,
  onBack,
}: SignInEmailCodeStepProps) => {
  const { t } = useTranslation('auth');
  const [form] = Form.useForm<CodeFormValues>();
  const codeInputRef = useRef<any>(null);

  useEffect(() => {
    codeInputRef.current?.focus();
  }, []);

  const canResend = countdown === 0;

  return (
    <AuthCard
      desc={t('ugs.emailCode.desc', { defaultValue: '验证码已发送至 {{email}}', email })}
      title={t('ugs.emailCode.title', { defaultValue: '邮箱验证码登录' })}
    >
      <Form form={form} layout="vertical" onFinish={(values) => onVerify(values.code)}>
        <Form.Item
          name="code"
          style={{ marginBottom: 12 }}
          rules={[
            {
              message: t('ugs.emailCode.codeRequired', { defaultValue: '请输入验证码' }),
              required: true,
            },
            {
              len: 6,
              message: t('ugs.emailCode.codeLength', { defaultValue: '验证码为6位数字' }),
            },
          ]}
        >
          <Input
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            placeholder={t('ugs.emailCode.codePlaceholder', { defaultValue: '6位验证码' })}
            ref={codeInputRef}
            size="large"
            style={{ padding: 6 }}
          />
        </Form.Item>

        <Flexbox align="center" gap={12}>
          <Button block htmlType="submit" loading={loading} size="large" type="primary">
            {t('ugs.emailCode.verify', { defaultValue: '验证并登录' })}
          </Button>
          <Flexbox horizontal justify="space-between" style={{ width: '100%' }}>
            <Text fontSize={12} type="secondary">
              {canResend
                ? t('ugs.emailCode.resend', { defaultValue: '没收到验证码？' })
                : t('ugs.emailCode.countdown', {
                    defaultValue: '{{seconds}}秒后可重新发送',
                    seconds: countdown,
                  })}
            </Text>
            {canResend && (
              <Button loading={otpSending} size="small" type="link" onClick={() => onResend(email)}>
                {t('ugs.emailCode.resendBtn', { defaultValue: '重新发送' })}
              </Button>
            )}
          </Flexbox>
        </Flexbox>
      </Form>

      <Flexbox align="center" style={{ marginTop: 16 }}>
        <Button type="link" onClick={onBack}>
          {t('ugs.emailCode.back', { defaultValue: '返回邮箱登录' })}
        </Button>
      </Flexbox>

      <AuthAgreement />
    </AuthCard>
  );
};
