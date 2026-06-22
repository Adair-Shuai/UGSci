// UGS-MODIFY: UGS 市场弹窗内容（可复用模块 · 分类侧边栏 + 搜索 + 列表 + 详情 Modal）
//
// 复用 Lobe 社区商店的数据层（不直接用 Item 组件，因为 Item 内部 navigate 会跳走）：
// - 分类 hook：useMCPCategory / useSkillCategory / useCategory(Assistant)
// - 分类计数：useMcpCategories / useSkillCategories / useAssistantCategories
// - 列表数据：useFetchMcpList / useFetchSkillList / useAssistantList
// - 详情数据：useFetchMcpDetail / useFetchSkillDetail / useAssistantDetail
//
// 卡片与详情 Modal 自建（轻量），点击卡片在弹窗内弹出二级 Modal 展示详情 + 安装按钮，
// 不跳转到社区详情页，保持弹窗内闭环。
import { Avatar, Block, Center, Flexbox, Icon, Input, Tag } from '@lobehub/ui';
import { createModal } from '@lobehub/ui/base-ui';
import { createStaticStyles } from 'antd-style';
import { App, Button, Pagination, Skeleton } from 'antd';
import { Plus, Search } from 'lucide-react';
import { type FC, memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useCategory as useAssistantCategory } from '@/routes/(main)/community/(list)/agent/features/Category/useCategory';
import { usePermission } from '@/hooks/usePermission';
import { useCategory as useMcpCategory } from '@/hooks/useMCPCategory';
import { useSkillCategory } from '@/hooks/useSkillCategory';
import { agentSkillService } from '@/services/skill';
import { useAgentStore } from '@/store/agent';
import { useDiscoverStore } from '@/store/discover';
import { useToolStore } from '@/store/tool';
import {
  AssistantCategory,
  AssistantSorts,
  McpCategory,
  McpSorts,
  SkillCategory,
  SkillSorts,
} from '@/types/discover';

import { type UgsMarketType } from './index';

const styles = createStaticStyles(({ css, cssVar }) => ({
  container: css`
    display: flex;
    gap: 16px;
    height: 70vh;
  `,
  sidebar: css`
    flex-shrink: 0;
    width: 200px;
    overflow-y: auto;
    border-right: 1px solid ${cssVar.colorBorderSecondary};
    padding-right: 12px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: ${cssVar.colorFillSecondary};
      border-radius: 2px;
    }
  `,
  sidebarTitle: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 8px;
    padding: 0 4px;
  `,
  categoryItem: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: ${cssVar.borderRadius};
    cursor: pointer;
    font-size: 13px;
    color: ${cssVar.colorTextSecondary};
    transition: all 0.15s ease;

    &:hover {
      background: ${cssVar.colorFillTertiary};
      color: ${cssVar.colorText};
    }
  `,
  categoryItemActive: css`
    background: ${cssVar.colorPrimaryBg};
    color: ${cssVar.colorPrimary};
    font-weight: 500;

    &:hover {
      background: ${cssVar.colorPrimaryBg};
      color: ${cssVar.colorPrimary};
    }
  `,
  categoryIcon: css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
  `,
  categoryLabel: css`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  main: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
    min-width: 0;
  `,
  listScroll: css`
    flex: 1;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    align-content: start;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: ${cssVar.colorFillSecondary};
      border-radius: 2px;
    }
  `,
  card: css`
    cursor: pointer;
    height: 100%;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: ${cssVar.borderRadiusLG};
    background: ${cssVar.colorBgContainer};
    padding: 12px;
    transition: all 0.15s ease;

    &:hover {
      border-color: ${cssVar.colorPrimary};
      box-shadow: ${cssVar.boxShadowTertiary};
      transform: translateY(-1px);
    }
  `,
  cardTitle: css`
    color: ${cssVar.colorText};
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  cardDesc: css`
    color: ${cssVar.colorTextSecondary};
    font-size: 11px;
    line-height: 1.5;
    margin-top: 6px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  `,
  cardMeta: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 10px;
    margin-top: 8px;
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  `,
  pagination: css`
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    padding-top: 4px;
  `,
  loading: css`
    padding: 40px;
  `,
  detailSection: css`
    margin-bottom: 16px;
  `,
  detailLabel: css`
    color: ${cssVar.colorTextTertiary};
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 4px;
  `,
  detailText: css`
    color: ${cssVar.colorTextSecondary};
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    max-height: 200px;
    overflow-y: auto;
  `,
  detailPrompt: css`
    color: ${cssVar.colorTextSecondary};
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    max-height: 280px;
    overflow-y: auto;
    background: ${cssVar.colorFillQuaternary};
    padding: 10px 12px;
    border-radius: ${cssVar.borderRadius};
    font-family: 'SF Mono', 'Menlo', monospace;
  `,
}));

// ===== 自建轻量卡片（不依赖社区 Item 的 navigate） =====
const MarketCard: FC<{
  avatar?: string;
  category?: string;
  description?: string;
  identifier: string;
  name: string;
  onClick?: () => void;
  tags?: string[];
}> = ({ avatar, category, description, identifier, name, onClick, tags }) => {
  const { t } = useTranslation('discover');
  const categoryLabel = category
    ? t(`category.assistant.${category}`, { defaultValue: t(`mcp.categories.${category}.name`, { defaultValue: category }) })
    : null;

  return (
    <div className={styles.card} onClick={onClick}>
      <Flexbox align="center" gap={10} horizontal>
        <Avatar avatar={avatar ?? identifier} shape="square" size={36} />
        <Flexbox flex={1} gap={2} style={{ minWidth: 0 }}>
          <span className={styles.cardTitle}>{name}</span>
          {categoryLabel && (
            <Tag size="small" style={{ margin: 0, fontSize: 10 }}>
              {categoryLabel}
            </Tag>
          )}
        </Flexbox>
      </Flexbox>
      {description && <div className={styles.cardDesc}>{description}</div>}
      <div className={styles.cardMeta}>
        <span style={{ fontFamily: 'monospace' }}>
          {identifier.length > 20 ? identifier.slice(0, 20) + '…' : identifier}
        </span>
        {tags && tags.slice(0, 2).map((tag) => (
          <Tag key={tag} size="small" style={{ margin: 0, fontSize: 10 }}>{tag}</Tag>
        ))}
      </div>
    </div>
  );
};

// ===== 详情 Modal 内容（弹窗内二级 Modal，不跳转） =====
const MarketDetailContent: FC<{ identifier: string; type: UgsMarketType }> = ({ identifier, type }) => {
  const { t } = useTranslation(['discover', 'common']);
  const { message } = App.useApp();
  const navigate = useWorkspaceAwareNavigate();
  const { allowed: canCreate } = usePermission('create_content');
  const [installing, setInstalling] = useState(false);

  const createAgent = useAgentStore((s) => s.createAgent);
  const installMCPPlugin = useToolStore((s) => s.installMCPPlugin);

  // 只拉取当前 type 对应的详情（节省不必要的 API 请求）
  const useFetchDetail = useDiscoverStore((s) => {
    if (type === 'agent') return s.useAssistantDetail;
    if (type === 'mcp') return s.useFetchMcpDetail;
    return s.useFetchSkillDetail;
  });
  const { data: detail, isLoading, error: detailError } = useFetchDetail({ identifier });

  // 安装/添加
  const handleInstall = useCallback(async () => {
    if (!canCreate) return;
    setInstalling(true);
    try {
      if (type === 'agent' && detail) {
        // 复用 Lobe AddAgent 逻辑：createAgent + marketIdentifier
        const result = await createAgent({
          config: {
            ...(detail as any).config,
            editorData: (detail as any).editorData,
            avatar: (detail as any).avatar,
            backgroundColor: (detail as any).backgroundColor,
            description: (detail as any).description,
            marketIdentifier: identifier,
            tags: (detail as any).tags,
            title: (detail as any).title,
          },
        });
        message.success(t('assistants.addAgentSuccess', { defaultValue: '添加成功' }));
        if (result?.agentId) navigate(`/agent/${result.agentId}`);
      } else if (type === 'mcp') {
        const installResult = await installMCPPlugin(identifier);
        if (installResult === true) {
          try {
            const toolStore = useToolStore.getState();
            await toolStore.syncPluginTools(identifier);
            message.success('MCP 安装成功');
          } catch (syncErr) {
            console.warn('[UgsMarket] MCP connector 同步失败:', syncErr);
            message.warning('MCP 已安装，但同步能力列表失败，请稍后重试');
          }
        } else if (installResult === false) {
          message.info('请完成配置以继续安装');
        } else {
          message.error('MCP 安装失败，请检查日志或重试');
        }
      } else if (type === 'skill') {
        await agentSkillService.importFromMarket(identifier);
        message.success('技能安装成功');
      }
    } catch (err) {
      message.error('安装失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setInstalling(false);
    }
  }, [canCreate, type, detail, identifier, createAgent, installMCPPlugin, message, navigate, t]);

  if (isLoading) {
    return (
      <div style={{ padding: 40 }}>
        <Skeleton active />
      </div>
    );
  }

  if (detailError || !detail) {
    return (
      <Center gap={12} padding={40}>
        <span style={{ color: 'var(--colorTextTertiary)', fontSize: 14 }}>
          {detailError ? '详情暂不可用，请检查网络连接或稍后重试' : '未找到该资源'}
        </span>
      </Center>
    );
  }

  const d = detail as any;
  const systemPrompt = d.config?.systemRole || d.systemRole || d.content || '';

  return (
    <Flexbox gap={16} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
      {/* 头部 */}
      <Flexbox align="flex-start" gap={12} horizontal>
        <Avatar avatar={d.avatar ?? identifier} shape="square" size={56} />
        <Flexbox flex={1} gap={4} style={{ minWidth: 0 }}>
          <span style={{ color: 'var(--colorText)', fontSize: 18, fontWeight: 600 }}>
            {d.title ?? d.name}
          </span>
          {d.author && (
            <span style={{ color: 'var(--colorTextTertiary)', fontSize: 12 }}>
              作者：{d.author}
            </span>
          )}
          {d.category && (
            <Tag size="small" style={{ margin: 0 }}>
              {t(`category.assistant.${d.category}`, { defaultValue: d.category })}
            </Tag>
          )}
        </Flexbox>
      </Flexbox>

      {/* 描述 */}
      {d.description && (
        <div className={styles.detailSection}>
          <div className={styles.detailLabel}>简介</div>
          <div className={styles.detailText}>{d.description}</div>
        </div>
      )}

      {/* 标签 */}
      {d.tags && d.tags.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.detailLabel}>标签</div>
          <Flexbox gap={6} horizontal wrap="wrap">
            {d.tags.map((tag: string) => (
              <Tag key={tag} size="small">{tag}</Tag>
            ))}
          </Flexbox>
        </div>
      )}

      {/* System Prompt（agent/skill） */}
      {systemPrompt && (
        <div className={styles.detailSection}>
          <div className={styles.detailLabel}>
            {type === 'agent' ? 'System Prompt' : '技能说明'}
          </div>
          <div className={styles.detailPrompt}>{systemPrompt}</div>
        </div>
      )}

      {/* 统计信息 */}
      <div className={styles.detailSection}>
        <div className={styles.detailLabel}>统计</div>
        <Flexbox gap={16} horizontal>
          {d.installCount !== undefined && (
            <span style={{ color: 'var(--colorTextSecondary)', fontSize: 12 }}>
              安装：{d.installCount}
            </span>
          )}
          {d.forkCount !== undefined && (
            <span style={{ color: 'var(--colorTextSecondary)', fontSize: 12 }}>
              Fork：{d.forkCount}
            </span>
          )}
          {d.tokenUsage !== undefined && d.tokenUsage > 0 && (
            <span style={{ color: 'var(--colorTextSecondary)', fontSize: 12 }}>
              Token：{d.tokenUsage}
            </span>
          )}
          {d.updatedAt && (
            <span style={{ color: 'var(--colorTextTertiary)', fontSize: 12 }}>
              更新：{new Date(d.updatedAt).toLocaleDateString('zh-CN')}
            </span>
          )}
        </Flexbox>
      </div>

      {/* 安装按钮 */}
      <div style={{ marginTop: 8 }}>
        <Button
          block
          disabled={!canCreate}
          icon={<Plus size={14} />}
          loading={installing}
          onClick={handleInstall}
          type="primary"
        >
          {type === 'agent' ? '添加专家' : type === 'mcp' ? '安装能力' : '安装技能'}
        </Button>
      </div>
    </Flexbox>
  );
};

interface UgsMarketContentProps {
  type: UgsMarketType;
}

/**
 * UGS 市场弹窗内容（可复用模块）
 *
 * 三页统一调用，分类侧边栏 + 搜索 + 卡片列表 + 分页 + 详情 Modal。
 * 点击卡片在弹窗内弹出二级 Modal 展示详情 + 安装按钮，不跳转到社区详情页。
 */
export const UgsMarketContent: FC<UgsMarketContentProps> = ({ type }) => {
  const { t } = useTranslation('discover');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string>('discover');

  // 分类列表
  const mcpCategories = useMcpCategory();
  const skillCategories = useSkillCategory();
  const assistantCategories = useAssistantCategory();

  // discover store
  const useMcpCategories = useDiscoverStore((s) => s.useMcpCategories);
  const useSkillCategories = useDiscoverStore((s) => s.useSkillCategories);
  const useAssistantCategories = useDiscoverStore((s) => s.useAssistantCategories);
  const useFetchMcpList = useDiscoverStore((s) => s.useFetchMcpList);
  const useFetchSkillList = useDiscoverStore((s) => s.useFetchSkillList);
  const useAssistantList = useDiscoverStore((s) => s.useAssistantList);

  const { data: mcpCategoryCounts = [] } = useMcpCategories({ q: keyword });
  const { data: skillCategoryCounts = [] } = useSkillCategories({ q: keyword });
  const { data: assistantCategoryCounts = [] } = useAssistantCategories({ q: keyword });

  const categoryParam =
    activeCategory === 'discover' || activeCategory === 'all' ? undefined : activeCategory;

  const mcpResult = useFetchMcpList({
    category: type === 'mcp' ? (categoryParam as McpCategory) : undefined,
    page: type === 'mcp' ? page : 1,
    pageSize: 21,
    q: type === 'mcp' ? keyword : undefined,
    sort: McpSorts.Recommended,
  });
  const skillResult = useFetchSkillList({
    category: type === 'skill' ? (categoryParam as SkillCategory) : undefined,
    page: type === 'skill' ? page : 1,
    pageSize: 21,
    q: type === 'skill' ? keyword : undefined,
    sort: SkillSorts.Recommended,
  });
  const agentResult = useAssistantList({
    category: type === 'agent' ? (categoryParam as AssistantCategory) : undefined,
    includeAgentGroup: true,
    page: type === 'agent' ? page : 1,
    pageSize: 21,
    q: type === 'agent' ? keyword : undefined,
    sort: AssistantSorts.Recommended,
  });

  const result = type === 'mcp' ? mcpResult : type === 'skill' ? skillResult : agentResult;
  const isLoading = result.isLoading;
  const data = result.data;
  const error = result.error;

  const categories = useMemo(() => {
    if (type === 'mcp') return mcpCategories;
    if (type === 'skill') return skillCategories;
    return assistantCategories;
  }, [type, mcpCategories, skillCategories, assistantCategories]);

  const categoryCounts = useMemo(() => {
    if (type === 'mcp') return mcpCategoryCounts;
    if (type === 'skill') return skillCategoryCounts;
    return assistantCategoryCounts;
  }, [type, mcpCategoryCounts, skillCategoryCounts, assistantCategoryCounts]);

  const getCount = (key: string): number | undefined => {
    if (key === 'discover' || key === 'all') {
      return (categoryCounts as any[]).reduce((acc, item) => acc + (item.count ?? 0), 0);
    }
    return (categoryCounts as any[]).find((item) => item.category === key)?.count;
  };

  // 点击卡片 → 弹出详情 Modal（不跳转）
  const handleCardClick = useCallback(
    (identifier: string) => {
      createModal({
        content: <MarketDetailContent identifier={identifier} type={type} />,
        footer: null,
        title: '详情',
        width: 'min(80%, 720px)',
      });
    },
    [type],
  );

  const renderSidebar = () => (
    <div className={styles.sidebar}>
      <div className={styles.sidebarTitle}>{t('category.title', { defaultValue: '分类' })}</div>
      {categories.map((item: any) => {
        const count = getCount(item.key);
        const isActive = activeCategory === item.key;
        return (
          <div
            key={item.key}
            className={`${styles.categoryItem} ${isActive ? styles.categoryItemActive : ''}`}
            onClick={() => {
              setActiveCategory(item.key);
              setPage(1);
            }}
          >
            <span className={styles.categoryIcon}>
              <Icon icon={item.icon} size={16} />
            </span>
            <span className={styles.categoryLabel}>{item.label}</span>
            {count !== undefined && count > 0 && (
              <Tag size="small" style={{ borderRadius: 10, margin: 0, paddingInline: 6 }}>
                {count}
              </Tag>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderList = () => {
    if (isLoading) {
      return (
        <div className={styles.loading}>
          <Skeleton active />
        </div>
      );
    }

    if (error || !data) {
      return (
        <Center gap={12} padding={40}>
          <Icon icon={Search} size={48} />
          <span style={{ color: 'var(--colorTextTertiary)' }}>
            {error ? '市场暂不可用，请检查网络连接或稍后重试' : '暂无内容'}
          </span>
        </Center>
      );
    }

    const items = (data.items ?? []) as any[];

    if (items.length === 0) {
      return (
        <Center gap={12} padding={40}>
          <Icon icon={Search} size={48} />
          <span style={{ color: 'var(--colorTextTertiary)' }}>
            {keyword ? `未找到匹配「${keyword}」的内容` : '暂无内容'}
          </span>
        </Center>
      );
    }

    return (
      <div className={styles.listScroll}>
        {items.map((item) => (
          <MarketCard
            avatar={item.avatar ?? item.icon}
            category={item.category}
            description={item.description}
            identifier={item.identifier}
            key={item.identifier}
            name={item.title ?? item.name}
            onClick={() => handleCardClick(item.identifier)}
            tags={item.tags}
          />
        ))}
      </div>
    );
  };

  const renderPagination = () => {
    if (!data) return null;
    const { currentPage, pageSize, totalCount } = data;
    if (totalCount <= pageSize) return null;
    return (
      <div className={styles.pagination}>
        <Pagination
          current={currentPage}
          onChange={(p) => setPage(p)}
          pageSize={pageSize}
          showSizeChanger={false}
          size="small"
          total={totalCount}
        />
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {renderSidebar()}
      <div className={styles.main}>
        <Input
          allowClear
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
          placeholder="搜索..."
          prefix={<Search size={14} />}
          size="middle"
          value={keyword}
        />
        {renderList()}
        {renderPagination()}
      </div>
    </div>
  );
};

export default memo(UgsMarketContent);
