'use client';

import { Alert, Button, Center, Flexbox, Text } from '@lobehub/ui';
import { cssVar } from 'antd-style';
import { Undo2Icon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';

import UserInfo from '@/features/User/UserInfo';
import { useElectronStore } from '@/store/electron';

import LobeMessage from '../components/LobeMessage';

interface LoginStepProps {
  onBack: () => void;
  onNext: () => void;
}

const LoginStep = memo<LoginStepProps>(({ onBack, onNext }) => {
  const { t } = useTranslation('desktop-onboarding');
  const [dataSyncConfig] = useElectronStore((s) => [s.dataSyncConfig]);

  // Wait for auth state to load before rendering anything
  if (!dataSyncConfig) return null;

  const isAuthed = !!dataSyncConfig.active && dataSyncConfig.storageMode === 'cloud';

  // If user is not authenticated, redirect immediately to /signin (no Cloud UI flash)
  if (!isAuthed) {
    const cbUrl = encodeURIComponent(window.location.origin + '/');
    return <Navigate replace to={`/signin?callbackUrl=${cbUrl}`} />;
  }

  // User is authenticated — show success content with "next" button
  return (
    <Center gap={32} style={{ height: '100%', minHeight: '100%' }}>
      <Flexbox align={'flex-start'} justify={'flex-start'} style={{ width: '100%' }}>
        <LobeMessage sentences={[t('screen5.title'), t('screen5.title2'), t('screen5.title3')]} />
        <Text as={'p'}>{t('screen5.description')}</Text>
      </Flexbox>

      <Flexbox gap={16} style={{ width: '100%' }}>
        <Alert
          description={t('authResult.success.desc')}
          style={{ width: '100%' }}
          title={t('authResult.success.title')}
          type={'success'}
        />
        <UserInfo
          style={{
            background: cssVar.colorFillSecondary,
            borderRadius: 8,
          }}
        />
      </Flexbox>

      <Flexbox horizontal justify={'space-between'} style={{ marginTop: 32 }}>
        <Button
          icon={Undo2Icon}
          style={{ color: cssVar.colorTextDescription }}
          type={'text'}
          onClick={onBack}
        >
          {t('back')}
        </Button>
        <Button type={'primary'} onClick={onNext}>
          {t('screen5.navigation.next')}
        </Button>
      </Flexbox>
    </Center>
  );
});

LoginStep.displayName = 'LoginStep';

export default LoginStep;
