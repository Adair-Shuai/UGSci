'use client';

import { type IconProps } from '@lobehub/ui';
import { Block, Button, Flexbox, Icon, Text } from '@lobehub/ui';
import { TypewriterEffect } from '@lobehub/ui/awesome';
import { LoadingDots } from '@lobehub/ui/chat';
import { Steps } from 'antd';
import { cssVar } from 'antd-style';
import { BrainIcon, PencilRulerIcon, WorkflowIcon } from 'lucide-react';
import { memo, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ProductLogo } from '@/components/Branding';
import { useUserStore } from '@/store/user';

interface WelcomeStepProps {
  onNext: () => void;
}

const WelcomeStep = memo<WelcomeStepProps>(({ onNext }) => {
  const { t, i18n } = useTranslation('onboarding');
  const locale = i18n.language;
  const updateGeneralConfig = useUserStore((s) => s.updateGeneralConfig);

  const handleNext = () => {
    // Enable telemetry by default
    updateGeneralConfig({ telemetry: true });
    onNext();
  };

  // eslint-disable-next-line @eslint-react/no-nested-component-definitions
  const IconAvatar = useCallback(({ icon }: { icon: IconProps['icon'] }) => {
    return (
      <Block
        shadow
        align="center"
        height={32}
        justify="center"
        padding={4}
        variant="outlined"
        width={32}
      >
        <Icon color={cssVar.colorTextDescription} icon={icon} size={16} />
      </Block>
    );
  }, []);

  return (
    <Flexbox align="center" gap={16} justify="center">
      <ProductLogo size={64} />
      <Flexbox align="center" gap={16} justify="center" style={{ marginBottom: 16 }}>
        <Text as={'h1'} fontSize={28} weight={'bold'}>
          <TypewriterEffect
            cursorCharacter={<LoadingDots size={28} variant={'pulse'} />}
            cursorFade={false}
            deletePauseDuration={1000}
            deletingSpeed={32}
            hideCursorWhileTyping={'afterTyping'}
            key={locale}
            pauseDuration={16_000}
            typingSpeed={64}
            sentences={[
              t('telemetry.title'),
              t('telemetry.title2'),
              t('telemetry.title3'),
            ]}
          />
        </Text>
        <Text as={'p'}>
          <Trans
            components={{
              brand: <span style={{ color: cssVar.colorPrimary, fontWeight: 600 }} />,
            }}
            i18nKey="telemetry.desc"
            ns="onboarding"
          />
        </Text>
      </Flexbox>
      <Steps
        current={null as any}
        direction={'vertical'}
        items={[
          {
            description: (
              <Text as={'p'} color={cssVar.colorTextSecondary} style={{ marginBottom: 16, whiteSpace: 'pre-line' }}>
                {t('telemetry.rows.create.desc')}
              </Text>
            ),
            icon: <IconAvatar icon={BrainIcon} />,
            title: (
              <Text as={'h2'} fontSize={16}>
                {t('telemetry.rows.create.title')}
              </Text>
            ),
          },
          {
            description: (
              <Text as={'p'} color={cssVar.colorTextSecondary} style={{ marginBottom: 16, whiteSpace: 'pre-line' }}>
                {t('telemetry.rows.collaborate.desc')}
              </Text>
            ),
            icon: <IconAvatar icon={PencilRulerIcon} />,
            title: (
              <Text as={'h2'} fontSize={16}>
                {t('telemetry.rows.collaborate.title')}
              </Text>
            ),
          },
          {
            description: (
              <Text as={'p'} color={cssVar.colorTextSecondary} style={{ whiteSpace: 'pre-line' }}>
                {t('telemetry.rows.evolve.desc')}
              </Text>
            ),
            icon: <IconAvatar icon={WorkflowIcon} />,
            title: (
              <Text as={'h2'} fontSize={16}>
                {t('telemetry.rows.evolve.title')}
              </Text>
            ),
          },
        ]}
      />
      <Button
        size={'large'}
        type="primary"
        style={{
          marginBlock: 8,
          maxWidth: 240,
        }}
        onClick={handleNext}
      >
        {t('telemetry.next')}
      </Button>
    </Flexbox>
  );
});

WelcomeStep.displayName = 'WelcomeStep';

export default WelcomeStep;
