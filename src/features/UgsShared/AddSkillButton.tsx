// UGS-MODIFY: UGS-017 添加技能/能力弹窗（共享组件）
// 从 UgsSkills/AddSkillButton 移出，供技能中心、能力中心等多页面复用。
//
// 复用 LobeHub AddSkillButton 内置的 4 个子弹窗：
// - ImportFromUrlModal   从 URL 导入 MCP manifest
// - ImportFromGithubModal 从 GitHub 仓库导入
// - UploadSkillModal      上传 zip 包安装
// - CustomConnectorModal  自定义 OAuth MCP connector
//
// 不重新实现 —— 这些弹窗已经包含完整的校验、安装、错误处理逻辑。
import { Button, DropdownMenu, Flexbox, Icon, Text } from '@lobehub/ui';
import { GithubIcon } from '@lobehub/ui/icons';
import { ChevronDown, FileArchive, Grid2x2Plus, Link, PenLine } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CustomConnectorModal } from '@/features/Connectors';
import { usePermission } from '@/hooks/usePermission';
import ImportFromGithubModal from '@/features/SkillStore/SkillList/ImportFromGithubModal';
import ImportFromUrlModal from '@/features/SkillStore/SkillList/ImportFromUrlModal';
import UploadSkillModal from '@/features/SkillStore/SkillList/UploadSkillModal';

const MenuLabel = ({ desc, title }: { desc: string; title: ReactNode }) => (
  <Flexbox gap={2}>
    <span>{title}</span>
    <Text style={{ fontSize: 12 }} type="secondary">
      {desc}
    </Text>
  </Flexbox>
);

interface AddSkillButtonProps {
  /** 自定义按钮文案（默认「添加技能」） */
  customLabel?: string;
  /** 自定义主菜单标题（默认不传，用 i18n） */
  customTitle?: string;
  /** 安装成功后的回调（刷新已安装列表） */
  onPostInstall?: () => void;
}

/**
 * 「添加技能/能力」按钮（顶部右侧全局控件）
 *
 * 下拉菜单 4 项：
 * 1. 从 URL 导入 — 输入 MCP manifest URL
 * 2. 从 GitHub 导入 — 输入 GitHub 仓库地址
 * 3. 上传 zip 包 — 上传本地技能压缩包
 * 4. 自定义 MCP — 配置自定义 OAuth MCP connector
 *
 * 权限：需要 create_content 权限（与 LobeHub AddSkillButton 一致）
 */
const AddSkillButton = ({ customLabel, customTitle, onPostInstall }: AddSkillButtonProps) => {
  const { t } = useTranslation('setting');
  const [showMcpModal, setMcpModal] = useState(false);
  const [showUrlModal, setUrlModal] = useState(false);
  const [showGithubModal, setGithubModal] = useState(false);
  const [showUploadModal, setUploadModal] = useState(false);
  const { allowed: canCreate } = usePermission('create_content');
  const { allowed: canEdit } = usePermission('edit_own_content');

   // 弹窗关闭时统一触发 onPostInstall（用户可能在弹窗中完成安装）
   const handleAnyClose = (open: boolean) => {
     if (!open) {
       setMcpModal(false);
       setUrlModal(false);
       setGithubModal(false);
       setUploadModal(false);
       onPostInstall?.();
     }
   };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <CustomConnectorModal open={showMcpModal} onClose={() => handleAnyClose(false)} />
      <ImportFromUrlModal open={showUrlModal} onOpenChange={handleAnyClose} />
      <ImportFromGithubModal open={showGithubModal} onOpenChange={handleAnyClose} />
      <UploadSkillModal open={showUploadModal} onOpenChange={handleAnyClose} />
      <DropdownMenu
        nativeButton
        placement="bottomRight"
        items={[
          {
            disabled: !canCreate,
            icon: <Icon icon={Link} />,
            key: 'importUrl',
            label: <MenuLabel desc={t('tab.importFromUrl.desc')} title={t('tab.importFromUrl')} />,
            onClick: () => {
              if (!canCreate) return;
              setUrlModal(true);
            },
          },
          {
            disabled: !canCreate,
            icon: <Icon icon={GithubIcon} />,
            key: 'importGithub',
            label: (
              <MenuLabel desc={t('tab.importFromGithub.desc')} title={t('tab.importFromGithub')} />
            ),
            onClick: () => {
              if (!canCreate) return;
              setGithubModal(true);
            },
          },
          {
            disabled: !canCreate,
            icon: <Icon icon={FileArchive} />,
            key: 'uploadZip',
            label: <MenuLabel desc={t('tab.uploadZip.desc')} title={t('tab.uploadZip')} />,
            onClick: () => {
              if (!canCreate) return;
              setUploadModal(true);
            },
          },
          { type: 'divider' as const },
          {
            disabled: !canCreate || !canEdit,
            icon: <Icon icon={PenLine} />,
            key: 'customMcp',
            label: <MenuLabel desc={t('tab.addCustomMcp.desc')} title={t('tab.addCustomMcp')} />,
            onClick: () => {
              if (!canCreate || !canEdit) return;
              setMcpModal(true);
            },
          },
        ]}
      >
        <Button disabled={!canCreate} icon={Grid2x2Plus} type="primary">
          {customLabel ?? '添加技能'}
          <Icon icon={ChevronDown} size={14} />
        </Button>
      </DropdownMenu>
    </div>
  );
};

export default AddSkillButton;
