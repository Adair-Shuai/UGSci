'use client';

import { useWatchBroadcast } from '@lobechat/electron-client-ipc';
import { Button, Flexbox, Icon } from '@lobehub/ui';
import { createModal, ModalFooter, type ModalInstance } from '@lobehub/ui/base-ui';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface AuthRequiredModalContentProps {
  onClose: () => void;
}

const AuthRequiredModalContent = memo<AuthRequiredModalContentProps>(() => {
  const { t } = useTranslation('auth');
  return <p style={{ margin: 0 }}>{t('authModal.description')}</p>;
});

AuthRequiredModalContent.displayName = 'AuthRequiredModalContent';

interface FooterProps {
  onLater: () => void;
  onSignIn: () => void;
}

const AuthRequiredFooter = memo<FooterProps>(({ onLater, onSignIn }) => {
  const { t } = useTranslation('auth');
  return (
    <ModalFooter>
      <Button onClick={onLater}>{t('authModal.later')}</Button>
      <Button icon={<Icon icon={ExternalLink} />} type="primary" onClick={onSignIn}>
        {t('authModal.signIn')}
      </Button>
    </ModalFooter>
  );
});
AuthRequiredFooter.displayName = 'AuthRequiredFooter';

export const useAuthRequiredModal = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const instanceRef = useRef<ModalInstance | null>(null);

  const open = useCallback(() => {
    if (instanceRef.current) return;

    const handleClose = () => {
      instanceRef.current?.close();
      instanceRef.current = null;
    };

    const handleSignIn = () => {
      handleClose();
      navigate('/signin');
    };

    const renderFooter = () => <AuthRequiredFooter onLater={handleClose} onSignIn={handleSignIn} />;

    instanceRef.current = createModal({
      content: <AuthRequiredModalContent onClose={handleClose} />,
      footer: renderFooter(),
      mask: { closable: false },
      title: (
        <Flexbox horizontal align="center" gap={8}>
          <Icon icon={AlertCircle} />
          {t('authModal.title')}
        </Flexbox>
      ),
    });
  }, [t, navigate]);

  return { open };
};

const AuthRequiredModal = memo(() => {
  const navigate = useNavigate();

  useWatchBroadcast('authorizationRequired', (payload) => {
    const reason = payload?.reason ?? 'unknown';
    // Navigate to sign-in page instead of opening OIDC modal
    navigate('/signin');
  });

  return null;
});

AuthRequiredModal.displayName = 'AuthRequiredModal';

export default AuthRequiredModal;
