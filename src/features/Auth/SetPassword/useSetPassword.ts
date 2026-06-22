// UGS-MODIFY: Hook for setting initial password after OTP sign-in
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { message } from '@/components/AntdStaticMethods';

interface SetPasswordFormValues {
  confirmPassword: string;
  password: string;
}

export const useSetPassword = () => {
  const { t } = useTranslation('auth');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values: SetPasswordFormValues) => {
    if (values.password !== values.confirmPassword) {
      message.error(t('ugs.setPassword.mismatch', { defaultValue: '两次密码输入不一致' }));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/set-password', {
        body: JSON.stringify({ password: values.password }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        message.error(data.error || t('ugs.setPassword.error', { defaultValue: '设置密码失败' }));
        return;
      }

      message.success(t('ugs.setPassword.success', { defaultValue: '密码设置成功' }));
      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('Set password error:', error);
      message.error(t('ugs.setPassword.error', { defaultValue: '设置密码失败' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    window.location.href = '/';
  };

  return { loading, onSubmit, handleSkip };
};
