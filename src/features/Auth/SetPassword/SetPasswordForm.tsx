// UGS-MODIFY: Set password form after email OTP sign-in
'use client';

import { Button, Flexbox, Icon, InputPassword } from '@lobehub/ui';
import type { InputRef } from 'antd';
import { Form } from 'antd';
import { Lock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import AuthCard from '@/features/AuthCard';

import { useSetPassword } from './useSetPassword';

interface SetPasswordFormValues {
  confirmPassword: string;
  password: string;
}

const SetPasswordForm = () => {
  const { t } = useTranslation('auth');
  const { loading, onSubmit, handleSkip } = useSetPassword();
  const [form] = Form.useForm<SetPasswordFormValues>();
  const passwordInputRef = useRef<InputRef>(null);

  useEffect(() => {
    passwordInputRef.current?.focus();
  }, []);

  return (
    <AuthCard
      title={t('ugs.setPassword.title', { defaultValue: '设置登录密码' })}
      desc={t('ugs.setPassword.desc', {
        defaultValue: '为你的账户设置一个密码，以后可以使用密码或验证码登录',
      })}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="password"
          style={{ marginBottom: 12 }}
          rules={[
            {
              message: t('ugs.setPassword.passwordRequired', { defaultValue: '请输入密码' }),
              required: true,
            },
            {
              message: t('ugs.setPassword.passwordMinLength', { defaultValue: '密码至少8位' }),
              min: 8,
            },
          ]}
        >
          <InputPassword
            prefix={<Icon icon={Lock} style={{ marginInline: 6 }} />}
            ref={passwordInputRef}
            size="large"
            placeholder={t('ugs.setPassword.passwordPlaceholder', {
              defaultValue: '请输入密码（至少8位）',
            })}
          />
        </Form.Item>
        <Form.Item
          dependencies={['password']}
          name="confirmPassword"
          style={{ marginBottom: 16 }}
          rules={[
            {
              message: t('ugs.setPassword.confirmRequired', { defaultValue: '请确认密码' }),
              required: true,
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(t('ugs.setPassword.mismatch', { defaultValue: '两次密码输入不一致' })),
                );
              },
            }),
          ]}
        >
          <InputPassword
            placeholder={t('ugs.setPassword.confirmPlaceholder', { defaultValue: '再次输入密码' })}
            prefix={<Icon icon={Lock} style={{ marginInline: 6 }} />}
            size="large"
          />
        </Form.Item>
        <Button block htmlType="submit" loading={loading} size="large" type="primary">
          {t('ugs.setPassword.submit', { defaultValue: '设置密码并进入' })}
        </Button>
        <Flexbox align="center" style={{ marginTop: 16 }}>
          <Button block size="large" variant="text" onClick={handleSkip}>
            {t('ugs.setPassword.skip', { defaultValue: '跳过，以后再说' })}
          </Button>
        </Flexbox>
      </Form>
    </AuthCard>
  );
};

export default SetPasswordForm;
