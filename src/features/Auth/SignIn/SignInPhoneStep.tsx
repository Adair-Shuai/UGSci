// UGS-MODIFY: UGS-005 phone number sign-in step component
import { Button, Flexbox, Input, Text } from '@lobehub/ui';
import { Form } from 'antd';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import AuthCard from '@/features/AuthCard';
import { AuthAgreement } from '@/features/AuthShell';

/** 默认区号（中国大陆） */
export const DEFAULT_COUNTRY_CODE = '+86';
/** 11 位中国大陆手机号 */
const CN_MOBILE_REGEX = /^1[3-9]\d{9}$/;
/** 已带国际区号的号码 */
export const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

/**
 * 把用户输入规范化为带国际区号的格式。
 * - 纯 11 位中国手机号（1xxxxxxxxxx）→ +861xxxxxxxxxx
 * - 已带 + 的号码 → 原样返回
 * - 其他 → 补 +86 前缀
 */
export const normalizePhone = (raw: string): string => {
  const trimmed = raw.trim().replace(/[\s-]/g, '');
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('+')) return trimmed;
  if (CN_MOBILE_REGEX.test(trimmed)) return `${DEFAULT_COUNTRY_CODE}${trimmed}`;
  return `${DEFAULT_COUNTRY_CODE}${trimmed}`;
};

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
      const raw = await form.validateFields(['phone']).then((v) => v.phone);
      if (raw) await onSendOtp(normalizePhone(raw));
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
        onFinish={(values) => onVerify(normalizePhone(values.phone), values.code)}
      >
        <Form.Item
          name="phone"
          rules={[
            { message: t('ugs.phoneSignin.phoneRequired', { defaultValue: '请输入手机号' }), required: true },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const trimmed = (value as string).trim().replace(/[\s-]/g, '');
                // 接受：纯 11 位中国手机号，或已带国际区号的号码
                if (CN_MOBILE_REGEX.test(trimmed) || PHONE_REGEX.test(trimmed)) return Promise.resolve();
                return Promise.reject(
                  new Error(t('ugs.phoneSignin.phoneInvalid', { defaultValue: '请输入正确的手机号' })),
                );
              },
            },
          ]}
          style={{ marginBottom: 12 }}
        >
          <Input
            addonBefore={DEFAULT_COUNTRY_CODE}
            placeholder={t('ugs.phoneSignin.phonePlaceholder', { defaultValue: '138xxxx0000' })}
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
