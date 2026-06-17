// UGS-MODIFY: UGS-016 储气库能力中心主页面
import { Badge, Card, Tag } from 'antd';
import { type FC } from 'react';

import {
  type CapabilityGroup,
  DOMAIN_ICONS,
  DOMAIN_LABELS,
  UGS_CAPABILITIES,
} from './ugsCapabilitiesData';

const STATUS_COLOR: Record<string, string> = {
  available: 'default',
  connected: 'success',
  planned: 'warning',
};

const STATUS_LABEL: Record<string, string> = {
  available: '可用',
  connected: '已连接',
  planned: '规划中',
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
            <Badge
              key={src.name}
              count={src.name}
              color={src.status === 'connected' ? '#52c41a' : src.status === 'planned' ? '#faad14' : '#d9d9d9'}
              style={{ fontSize: 11 }}
            />
          ))}
        </div>
      </div>

      {/* 能力列表 */}
      <div>
        <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>原子能力（{group.items.length}）：</div>
        {group.items.map((item) => (
          <div
            key={item.functionName}
            style={{
              borderBottom: '1px solid #f5f5f5',
              display: 'flex',
              gap: 8,
              padding: '6px 0',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#1f1f1f', fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                <Tag style={{ fontSize: 10, margin: 0 }} color="blue">
                  {item.functionName}
                </Tag>
              </div>
              {item.params && (
                <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                  参数：{item.params}
                </div>
              )}
              {item.returns && (
                <div style={{ color: '#888', fontSize: 11 }}>
                  返回：{item.returns}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const UgsCapabilitiesPage: FC = () => {
  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1f1f1f', margin: 0 }}>
          🔧 UGSci 能力中心
        </h1>
        <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
          平台底层原子能力（MCP / API / 算法），专家和技能在此之上封装业务功能
        </p>
      </div>

      {/* 统计概览 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>已连接 MCP</div>
          <div style={{ color: '#52c41a', fontSize: 20, fontWeight: 600 }}>2</div>
          <div style={{ color: '#888', fontSize: 11 }}>NeqSim · pyResToolbox</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>原子能力</div>
          <div style={{ color: '#185FA5', fontSize: 20, fontWeight: 600 }}>
            {UGS_CAPABILITIES.reduce((sum, g) => sum + g.items.length, 0)}
          </div>
          <div style={{ color: '#888', fontSize: 11 }}>覆盖 {UGS_CAPABILITIES.length} 个领域</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>规划中</div>
          <div style={{ color: '#faad14', fontSize: 20, fontWeight: 600 }}>
            {UGS_CAPABILITIES.flatMap((g) => g.sources).filter((s) => s.status === 'planned').length}
          </div>
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
