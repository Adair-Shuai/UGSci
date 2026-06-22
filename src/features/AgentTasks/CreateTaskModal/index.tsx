'use client';

import { createModal, type ModalInstance } from '@lobehub/ui/base-ui';

import CreateTaskContent, { type CreateTaskContentProps } from './CreateTaskContent';

export const createTaskModal = (props?: CreateTaskContentProps): ModalInstance =>
  createModal({
    content: <CreateTaskContent {...props} />,
    footer: null,
    mask: { closable: true },
    styles: {
      content: {
        overflow: 'hidden',
        padding: 0,
      },
    },
    title: null,
    width: 'min(80%, 680px)',
  });
