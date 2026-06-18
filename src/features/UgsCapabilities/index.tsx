// UGS-MODIFY: UGS-016 储气库能力中心主页面（展示 + 管理分离）
import { Button } from '@lobehub/ui';
import { Settings } from 'lucide-react';
import { Card, Tag } from 'antd';
import { type FC, useCallback } from 'react';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';

import PageHeader from '@/features/UgsShared/PageHeader';
import {
  type CapabilityGroup,
  DOMAIN_ICONS,
  DOMAIN_LABELS,
  UGS_CAPABILITIES,
} from './ugsCapabilitiesData';

const STATUS_TAG_COLOR: Record<string, string> = {
  available: 'default',
  connected: 'success',
  planned: 'warning',
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  algorithm: '算法',
  api: 'API',
  mcp: 'MCP',
};

const CapabilityCard: FC<{ group: CapabilityGroup }> = ({ group }) => {
  return (
    <Card
      size="small"
      style={{ height: '100%', borderColor: '#e8e8e8' }}
      styles={{ body: { padding: 16 } }}
      title={
        <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{DOMAIN_ICONS[group.domain]}</span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{group.title}</span>
          <span style={{ color: '#888', fontSize: 11, marginLeft: 'auto' }}>
            {DOMAIN_LABELS[group.domain]}
          </span>
        </div>
      }
    >
      <div style={{ color: '#595959', fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
        {group.description}
      </div>

      {/* 能力来源 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>来源：</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {group.sources.map((src) => (
            <Tag color={STATUS_TAG_COLOR[src.status]} key={src.name} style={{ fontSize: 11, margin: 0 }}>
              {src.name}
              <span style={{ color: '#bbb', fontSize: 10, marginLeft: 4 }}>
                · {SOURCE_TYPE_LABEL[src.type]}
              </span>
            </Tag>
          ))}
        </div>
      </div>

      {/* 能力列表 */}
      <div>
        <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>
          原子能力（{group.items.length}）：
        </div>
        {group.items.map((item) => (
          <div key={item.functionName} style={{ borderBottom: '1px solid #f5f5f5', padding: '6px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#1f1f1f', fontSize: 13, fontWeight: 500 }}>{item.label}</span>
              <Tag style={{ fontSize: 10, margin: 0 }} color="blue">
                {item.functionName}
              </Tag>
            </div>
            {item.params && (
              <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>参数：{item.params}</div>
            )}
            {item.returns && (
              <div style={{ color: '#888', fontSize: 11 }}>返回：{item.returns}</div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

const UgsCapabilitiesPage: FC = () => {
  const navigate = useWorkspaceAwareNavigate();
  const totalCapabilities = UGS_CAPABILITIES.reduce((sum, g) => sum + g.items.length, 0);
  const plannedSources = UGS_CAPABILITIES.flatMap((g) => g.sources).filter(
    (s) => s.status === 'planned',
  ).length;

  // 跳转到 MCP 管理页（暂时用 settings 路由，稍后改 /mcp）
  const handleManageMCP = useCallback(() => {
    navigate('/settings/agent');
  }, [navigate]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        description="平台底层原子能力（MCP / API / 算法），专家和技能在此之上封装业务功能"
        emoji="🔧"
        extra={
          <Button icon={<Settings size={16} />} onClick={handleManageMCP} size="small">
            管理 MCP
          </Button>
        }
        title="UGSci 能力中心"
      />

      {/* 统计概览 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>已连接 MCP</div>
          <div style={{ color: '#52c41a', fontSize: 20, fontWeight: 600 }}>2</div>
          <div style={{ color: '#888', fontSize: 11 }}>NeqSim · pyResToolbox</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>原子能力</div>
          <div style={{ color: '#185FA5', fontSize: 20, fontWeight: 600 }}>{totalCapabilities}</div>
          <div style={{ color: '#888', fontSize: 11 }}>覆盖 {UGS_CAPABILITIES.length} 个领域</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>规划中</div>
          <div style={{ color: '#faad14', fontSize: 20, fontWeight: 600 }}>{plannedSources}</div>
          <div style={{ color: '#888', fontSize: 11 }}>CMG · Petrel · OPM 等</div>
        </Card>
      </div>

      {/* 能力分组 */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {UGS_CAPABILITIES.map((group) => (
          <CapabilityCard group={group} key={group.domain} />
        ))}
      </div>
    </div>
  );
};

export default UgsCapabilitiesPage;
