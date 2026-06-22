'use client';

import { type AuthorizationPhase, type AuthorizationProgress } from '@lobechat/electron-client-ipc';
import { useWatchBroadcast } from '@lobechat/electron-client-ipc';
import { Alert, Button, Center, Flexbox, Icon, Text } from '@lobehub/ui';
import { cssVar } from 'antd-style';
import { Cloud, Undo2Icon } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import urlJoin from 'url-join';

import { OFFICIAL_SITE } from '@/const/url';
import { isDesktop } from '@/const/version';
import UserInfo from '@/features/User/UserInfo';
import { remoteServerService } from '@/services/electron/remoteServer';
import { electronSystemService } from '@/services/electron/system';
import { useElectronStore } from '@/store/electron';
import { setDesktopAutoOidcFirstOpenHandled } from '@/utils/electron/autoOidc';

import LobeMessage from '../components/LobeMessage';

const LEGACY_LOCAL_DB_MIGRATION_GUIDE_URL = urlJoin(
  OFFICIAL_SITE,
  '/docs/usage/migrate-from-local-database',
);

// Login method type
type LoginMethod = 'cloud';

// Login status type
type LoginStatus = 'idle' | 'loading' | 'success' | 'error';

const authorizationPhaseI18nKeyMap: Record<AuthorizationPhase, string> = {
  browser_opened: 'screen5.auth.phase.browserOpened',
  cancelled: 'screen5.actions.cancel',
  verifying: 'screen5.auth.phase.verifying',
  waiting_for_auth: 'screen5.auth.phase.waitingForAuth',
};

const loginMethodMetas = {
  cloud: {
    descriptionKey: 'screen5.methods.cloud.description',
    icon: Cloud,
    id: 'cloud' as LoginMethod,
    nameKey: 'screen5.methods.cloud.name',
  },

} as const satisfies Record<LoginMethod, unknown>;

interface LoginStepProps {
  onBack: () => void;
  onNext: () => void;
}

const LoginStep = memo<LoginStepProps>(({ onBack, onNext }) => {
  const { t } = useTranslation('desktop-onboarding');
  const [cloudLoginStatus, setCloudLoginStatus] = useState<LoginStatus>('idle');
  const [authProgress, setAuthProgress] = useState<AuthorizationProgress | null>(null);
  const [pendingLoginMethod, setPendingLoginMethod] = useState<LoginMethod | null>(null);
  const [isSuccessDismissed, setIsSuccessDismissed] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [hasLegacyLocalDb, setHasLegacyLocalDb] = useState(false);
  const [localRemainingSeconds, setLocalRemainingSeconds] = useState<number | null>(null);

  const [
    dataSyncConfig,
    isConnectingServer,
    remoteServerSyncError,
    useDataSyncConfig,
    connectRemoteServer,
    refreshServerConfig,
    clearRemoteServerSyncError,
  ] = useElectronStore((s) => [
    s.dataSyncConfig,
    s.isConnectingServer,
    s.remoteServerSyncError,
    s.useDataSyncConfig,
    s.connectRemoteServer,
    s.refreshServerConfig,
    s.clearRemoteServerSyncError,
  ]);

  useDataSyncConfig();

  useEffect(() => {
    if (!isDesktop) return;

    let mounted = true;
    electronSystemService
      .hasLegacyLocalDb()
      .then((value) => {
        if (mounted) setHasLegacyLocalDb(value);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const isCloudAuthed = !!dataSyncConfig?.active && dataSyncConfig.storageMode === 'cloud';
  const authorizedLoginMethod: LoginMethod | null = isCloudAuthed
    ? 'cloud'
    : null;
  const statusSuccessLoginMethod: LoginMethod | null = cloudLoginStatus === 'success' ? 'cloud' : null;
  const hasLocalLoginResult = cloudLoginStatus !== 'idle';

  const successLoginMethod = isSuccessDismissed
    ? null
    : (statusSuccessLoginMethod ??
      (!hasLocalLoginResult && !pendingLoginMethod ? authorizedLoginMethod : null));

  // Determine if user can proceed (either method succeeding is sufficient)
  const canStart = () => {
    return !!successLoginMethod;
  };

  // Handle cloud login
  const handleCloudLogin = async () => {
    if (!isDesktop) {
      setRemoteError(t('screen5.errors.desktopOnlyOidc'));
      setCloudLoginStatus('error');
      return;
    }

    setRemoteError(null);
    clearRemoteServerSyncError();
    setPendingLoginMethod('cloud');
    setIsSuccessDismissed(false);
    setCloudLoginStatus('loading');
    setDesktopAutoOidcFirstOpenHandled();
    await connectRemoteServer({
      remoteServerUrl: dataSyncConfig?.remoteServerUrl,
      storageMode: 'cloud',
    });
  };

  const handleBackToLoginMethods = (method: LoginMethod) => {
    setIsSuccessDismissed(true);
    setPendingLoginMethod(null);
    setCloudLoginStatus('idle');
    setAuthProgress(null);
    setRemoteError(null);
    clearRemoteServerSyncError();
  };

  // Sync local UI status with real remote config
  useEffect(() => {
    if (isCloudAuthed) {
      setCloudLoginStatus('success');
      setPendingLoginMethod(null);
    }
  }, [isCloudAuthed]);

  useEffect(() => {
    const message = remoteServerSyncError?.message;
    if (!message) return;
    setRemoteError(message);
    setPendingLoginMethod(null);
    if (cloudLoginStatus === 'loading') setCloudLoginStatus('error');
  }, [remoteServerSyncError?.message, cloudLoginStatus]);

  // Watch broadcasts from main process (polling result)
  useWatchBroadcast('authorizationSuccessful', async () => {
    setRemoteError(null);
    clearRemoteServerSyncError();
    setAuthProgress(null);
    setIsSuccessDismissed(false);
    setCloudLoginStatus('success');
    setPendingLoginMethod(null);
    await refreshServerConfig();
  });

  useWatchBroadcast('authorizationFailed', ({ error }) => {
    setRemoteError(error);
    setAuthProgress(null);
    setPendingLoginMethod(null);
    if (cloudLoginStatus === 'loading') setCloudLoginStatus('error');
  });

  useWatchBroadcast('authorizationProgress', (progress) => {
    setAuthProgress(progress);
    if (progress.phase === 'cancelled') {
      setCloudLoginStatus('idle');
      setPendingLoginMethod(null);
      setAuthProgress(null);
    }
  });

  // Sync local countdown from authProgress
  useEffect(() => {
    if (authProgress) {
      const seconds = Math.max(
        0,
        Math.ceil((authProgress.maxPollTime - authProgress.elapsed) / 1000),
      );
      setLocalRemainingSeconds(seconds);
    } else {
      setLocalRemainingSeconds(null);
    }
  }, [authProgress]);

  // Decrement local countdown every second for smooth UI updates
  useEffect(() => {
    if (localRemainingSeconds === null || localRemainingSeconds <= 0) return;

    const timer = setTimeout(() => {
      setLocalRemainingSeconds((prev) => {
        if (prev === null || prev <= 0) return prev;
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [localRemainingSeconds]);

  const handleCancelAuth = async () => {
    setRemoteError(null);
    clearRemoteServerSyncError();

    setCloudLoginStatus('idle');
    setPendingLoginMethod(null);
    setAuthProgress(null);
    await remoteServerService.cancelAuthorization();
  };

  const renderSuccessContent = (method: LoginMethod) => {
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
            onClick={() => handleBackToLoginMethods(method)}
          >
            {t('back')}
          </Button>
          <Button type={'primary'} onClick={onNext}>
            {t('screen5.navigation.next')}
          </Button>
        </Flexbox>
      </Center>
    );
  };

  // Render Cloud login content
  const renderCloudContent = () => {
    if (cloudLoginStatus === 'error') {
      const errorMessage = remoteError?.toLowerCase().includes('timed out')
        ? t('screen5.errors.timedOut')
        : remoteError || t('authResult.failed.desc');

      return (
        <Flexbox gap={16} style={{ width: '100%' }}>
          <Alert
            description={errorMessage}
            title={t('authResult.failed.title')}
            type={'secondary'}
          />
          <Button
            block
            icon={Cloud}
            size={'large'}
            type={'primary'}
            onClick={() => setCloudLoginStatus('idle')}
          >
            {t('screen5.actions.tryAgain')}
          </Button>
        </Flexbox>
      );
    }

    if (cloudLoginStatus === 'loading') {
      const phaseText = t(authorizationPhaseI18nKeyMap[authProgress?.phase ?? 'browser_opened'], {
        defaultValue: t('screen5.actions.signingIn'),
      });

      return (
        <Flexbox gap={8} style={{ width: '100%' }}>
          <Button block disabled={true} icon={Cloud} loading={true} size={'large'} type={'primary'}>
            {t('screen5.actions.signingIn')}
          </Button>
          <Text style={{ color: cssVar.colorTextDescription }} type={'secondary'}>
            {phaseText}
          </Text>
          <Flexbox horizontal align={'center'} justify={'space-between'}>
            {localRemainingSeconds !== null ? (
              <Text style={{ color: cssVar.colorTextDescription }} type={'secondary'}>
                {t('screen5.auth.remaining', {
                  time: localRemainingSeconds,
                })}
              </Text>
            ) : (
              <div />
            )}
            <Button size={'small'} type={'text'} onClick={handleCancelAuth}>
              {t('screen5.actions.cancel')}
            </Button>
          </Flexbox>
        </Flexbox>
      );
    }

    return (
      <Button
        block
        disabled={isConnectingServer}
        icon={Cloud}
        loading={false}
        size={'large'}
        type={'primary'}
        onClick={handleCloudLogin}
      >
        {t('screen5.actions.signInCloud')}
      </Button>
    );
  };

  if (successLoginMethod) return renderSuccessContent(successLoginMethod);

  return (
    <Center gap={32} style={{ height: '100%', minHeight: '100%' }}>
      <Flexbox align={'flex-start'} justify={'flex-start'} style={{ width: '100%' }}>
        <LobeMessage sentences={[t('screen5.title'), t('screen5.title2'), t('screen5.title3')]} />
        <Text as={'p'}>{t('screen5.description')}</Text>
      </Flexbox>

      <Flexbox align={'flex-start'} gap={16} style={{ width: '100%' }} width={'100%'}>
        {renderCloudContent()}
        <Flexbox horizontal justify={'center'} style={{ width: '100%' }}>
         {hasLegacyLocalDb && (
           <Button
             style={{ padding: 0 }}
             type={'link'}
             onClick={() =>
               electronSystemService.openExternalLink(LEGACY_LOCAL_DB_MIGRATION_GUIDE_URL)
             }
           >
             {t('screen5.legacyLocalDb.link', 'Migrate legacy local database')}
           </Button>
         )}
       </Flexbox>
     </Flexbox>
      {canStart() && (
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
      )}
    </Center>
  );
});

LoginStep.displayName = 'LoginStep';

export default LoginStep;
