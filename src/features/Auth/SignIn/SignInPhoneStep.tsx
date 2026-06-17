// UGS-MODIFY: UGS-005 phone number sign-in step component
import { Alert, Button, Flexbox, Icon, Input, Text } from '@lobehub/ui';
import { Form } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AuthCard from '@/features/AuthCard';
import { AuthAgreement } from '@/features/AuthShell';

export const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

export interface SignInPhoneStepProps {
  loading: boolean;
  otpSending: boolean;
  otpSent: boolean;
  countdown: number;
  onSendOtp: (phone: string) => Promise<void>;
  onVerify: (phone: string, code: string) => Promise<void>;
  onSwitchToEmail: () => void;
}

interface PhoneFormValues {
  phone: string;
  code: string;
}

export const SignInPhoneStep = ({
  loading,
  otpSending,
  otpSent,
  countdown,
  onSendOtp,
  onVerify,
  onSwitchToEmail,
}: SignInPhoneStepProps) => {
  const { t } = useTranslation('auth');
  const [form] = Form.useForm<PhoneFormValues>();
  const phoneInputRef = useRef<any>(null);

  useEffect(() => {
    phoneInputRef.current?.focus();
  }, []);

  const handleSendOtp = async () => {
    try {
      const phone = await form.validateFields(['phone']).then((v) => v.phone);
      if (phone) await onSendOtp(phone);
    } catch {
      // validation error
    }
  };

  const canResend = countdown === 0;

  return (
    <AuthCard title={t('ugs.phoneSignin.title', { defaultValue: '手机号登录' })}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => onVerify(values.phone, values.code)}
      >
        <Form.Item
          name="phone"
          rules={[
            { message: t('ugs.phoneSignin.phoneRequired', { defaultValue: '请输入手机号' }), required: true },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const trimmed = (value as string).trim();
                if (PHONE_REGEX.test(trimmed)) return Promise.resolve();
                return Promise.reject(
                  new Error(t('ugs.phoneSignin.phoneInvalid', { defaultValue: '手机号格式不正确，需含国际区号如 +86' })),
                );
              },
            },
          ]}
          style={{ marginBottom: 12 }}
        >
          <Input
            placeholder={t('ugs.phoneSignin.phonePlaceholder', { defaultValue: '+86 138xxxx0000' })}
            ref={phoneInputRef}
            size="large"
            style={{ padding: 6 }}
          />
        </Form.Item>

        {otpSent && (
          <Form.Item
            name="code"
            rules={[
              { message: t('ugs.phoneSignin.codeRequired', { defaultValue: '请输入验证码' }), required: true },
              { len: 6, message: t('ugs.phoneSignin.codeLength', { defaultValue: '验证码为6位数字' }) },
            ]}
            style={{ marginBottom: 12 }}
          >
            <Input
              placeholder={t('ugs.phoneSignin.codePlaceholder', { defaultValue: '6位验证码' })}
              size="large"
              maxLength={6}
              style={{ padding: 6 }}
            />
          </Form.Item>
        )}

        {otpSent && (
          <Flexbox align="center" gap={12}>
            <Button block htmlType="submit" loading={loading} size="large" type="primary">
              {t('ugs.phoneSignin.verify', { defaultValue: '验证并登录' })}
            </Button>
            <Flexbox horizontal justify="space-between" style={{ width: '100%' }}>
              <Text fontSize={12} type="secondary">
                {canResend
                  ? t('ugs.phoneSignin.resend', { defaultValue: '没收到验证码？' })
                  : t('ugs.phoneSignin.countdown', {
                      defaultValue: '{{seconds}}秒后可重新发送',
                      seconds: countdown,
                    })}
              </Text>
              {canResend && (
                <Button loading={otpSending} onClick={handleSendOtp} size="small" type="link">
                  {t('ugs.phoneSignin.resendBtn', { defaultValue: '重新发送' })}
                </Button>
              )}
            </Flexbox>
          </Flexbox>
        )}

        {!otpSent && (
          <Button block loading={otpSending} onClick={handleSendOtp} size="large" type="primary">
            {t('ugs.phoneSignin.sendCode', { defaultValue: '发送验证码' })}
          </Button>
        )}
      </Form>

      <Flexbox align="center" style={{ marginTop: 16 }}>
        <Button onClick={onSwitchToEmail} type="link">
          {t('ugs.phoneSignin.switchToEmail', { defaultValue: '使用邮箱登录' })}
        </Button>
      </Flexbox>

      <AuthAgreement />
    </AuthCard>
  );
};
