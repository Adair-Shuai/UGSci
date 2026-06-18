// UGS-MODIFY: UGS-016 能力中心 — 详情 Drawer（Functions / Config / Logs 三 Tab）
import { type LobeChatPluginApi } from '@lobechat/types';
import { Collapse, Descriptions, Empty, Input, Tag, Timeline, Typography } from 'antd';
import { type FC, memo, useMemo, useState } from 'react';

import type { CapabilityCardData } from './types';

const { Text, Paragraph } = Typography;

interface CapabilityDrawerContentProps {
  capability: CapabilityCardData;
}

// ============ Functions Tab ============
const FunctionsTab: FC<{ functions: LobeChatPluginApi[] }> = ({ functions }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return functions;
    const lower = search.toLowerCase();
    return functions.filter(
      (f) =>
        f.name?.toLowerCase().includes(lower) || f.description?.toLowerCase().includes(lower),
    );
  }, [functions, search]);

  if (functions.length === 0) {
    return <Empty description="暂无 tool functions" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const collapseItems = filtered.map((func, idx) => ({
    children: (
      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
        {func.parameters ? (
          <Descriptions bordered column={1} size="small">
            {func.parameters.map((param) => (
              <Descriptions.Item
                key={param.name}
                label={
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{param.name}</span>
                }
              >
                <div>
                  <Tag
                    color={param.type === 'string' ? 'blue' : 'green'}
                    style={{ fontSize: 10, margin: 0 }}
                  >
                    {param.type}
                  </Tag>
                  {param.required && (
                    <Tag color="red" style={{ fontSize: 10, margin: 0, marginLeft: 4 }}>
                      必填
                    </Tag>
                  )}
                </div>
                {param.description && (
                  <div style={{ color: '#888', marginTop: 2 }}>{param.description}</div>
                )}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : (
          <Text type="secondary" style={{ fontSize: 11 }}>
            无参数
          </Text>
        )}
      </div>
    ),
    key: `${func.name}-${idx}`,
    label: (
      <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
        <Tag color="blue" style={{ fontSize: 10, margin: 0, fontFamily: 'monospace' }}>
          {func.name}
        </Tag>
        <span style={{ color: '#595959', fontSize: 12 }}>
          {func.description?.slice(0, 60) ?? '(无描述)'}
        </span>
      </div>
    ),
  }));

  return (
    <div>
      <Input.Search
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索 function 名称或描述..."
        style={{ marginBottom: 12 }}
        allowClear
      />
      <Text style={{ color: '#888', display: 'block', fontSize: 11, marginBottom: 8 }}>
        共 {functions.length} 个 function{search && `，筛选后 ${filtered.length} 个`}
      </Text>
      <Collapse items={collapseItems} size="small" />
    </div>
  );
};

// ============ Config Tab ============
const ConfigTab: FC<{ capability: CapabilityCardData }> = ({ capability }) => {
  const mcp = capability.lobeTool?.customParams?.mcp;

  if (!capability.installed) {
    return (
      <Empty
        description="此能力尚未安装，暂无配置"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  if (!mcp) {
    return (
      <Empty
        description="此插件无 MCP 配置（可能是内置工具）"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div>
      <Descriptions bordered column={1} size="small" title="连接配置">
        <Descriptions.Item label="Transport 类型">
          <Tag color={mcp.type === 'stdio' ? 'blue' : 'green'}>{mcp.type}</Tag>
        </Descriptions.Item>
        {mcp.type === 'stdio' && (
          <>
            <Descriptions.Item label="Command">
              <Text code copyable style={{ fontSize: 11 }}>
                {mcp.command ?? '-'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Args">
              {mcp.args && mcp.args.length > 0 ? (
                <Text code style={{ fontSize: 11 }}>
                  {JSON.stringify(mcp.args)}
                </Text>
              ) : (
                <Text type="secondary">无</Text>
              )}
            </Descriptions.Item>
          </>
        )}
        {mcp.type === 'http' && (
          <Descriptions.Item label="Endpoint">
            <Text code copyable style={{ fontSize: 11 }}>
              {mcp.url ?? '-'}
            </Text>
          </Descriptions.Item>
        )}
        {mcp.headers && Object.keys(mcp.headers).length > 0 && (
          <Descriptions.Item label="Headers">
            <Text code style={{ fontSize: 11 }}>
              {Object.keys(mcp.headers).join(', ')}
            </Text>
          </Descriptions.Item>
        )}
        {mcp.auth && (
          <Descriptions.Item label="Auth">
            <Tag color="orange">{mcp.auth.type ?? 'bearer'}</Tag>
          </Descriptions.Item>
        )}
      </Descriptions>

      {mcp.env && Object.keys(mcp.env).length > 0 && (
        <Descriptions
          bordered
          column={1}
          size="small"
          style={{ marginTop: 16 }}
          title="环境变量"
        >
          {Object.entries(mcp.env).map(([key, val]) => (
            <Descriptions.Item key={key} label={key}>
              <Text code style={{ fontSize: 11 }}>
                {typeof val === 'string' && val.length > 8 ? val.slice(0, 8) + '…' : String(val)}
              </Text>
            </Descriptions.Item>
          ))}
        </Descriptions>
      )}

      <Paragraph style={{ color: '#888', fontSize: 11, marginTop: 16 }}>
        提示：MCP 配置编辑请前往「管理 MCP」页面（能力中心右上角按钮）
      </Paragraph>
    </div>
  );
};

// ============ Logs Tab ============
interface MockLogEntry {
  color: string;
  latency: string;
  status: 'success' | 'error';
  timestamp: string;
  toolName: string;
}

const LogsTab: FC<{ capability: CapabilityCardData }> = ({ capability }) => {
  // 一期：调用日志尚未接入，显示占位说明
  // 二期：对接 mcpService 调用埋点，记录 latency / success / error
  if (!capability.installed) {
    return (
      <Empty
        description="此能力尚未安装，暂无调用日志"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div>
      <div
        style={{
          background: '#f6f8fa',
          borderRadius: 6,
          marginBottom: 16,
          padding: '8px 12px',
        }}
      >
        <Text style={{ color: '#888', fontSize: 11 }}>
          调用日志功能正在建设中（二期实现）。
          将记录每个 tool function 的调用时间、延迟（latency）、成功/失败状态和错误信息。
        </Text>
      </div>

      <Empty
        description={
          <span style={{ fontSize: 12 }}>
            暂无调用记录
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              使用此 MCP 的 tool function 后，调用记录将显示在此处
            </Text>
          </span>
        }
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    </div>
  );
};

// ============ Drawer Content ============
const CapabilityDrawerContent: FC<CapabilityDrawerContentProps> = memo(({ capability }) => {
  const functions = (capability.lobeTool?.manifest?.api ?? []) as LobeChatPluginApi[];

  return (
    <div style={{ padding: '0 4px' }}>
      {/* 概览信息 */}
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 32 }}>{capability.icon}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{capability.name}</div>
            <Text style={{ color: '#888', fontSize: 11 }}>
              {capability.identifier ?? '(未安装)'}
            </Text>
          </div>
        </div>
        <Paragraph style={{ color: '#595959', fontSize: 12, marginBottom: 0 }}>
          {capability.description}
        </Paragraph>
      </div>

      {/* Tabs 内容（用 antd Tabs 在父组件渲染，这里直接展示三段） */}
      <div id="ugs-capability-functions">
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          Functions（{functions.length}）
        </Typography.Title>
        <FunctionsTab functions={functions} />
      </div>

      <div id="ugs-capability-config" style={{ marginTop: 24 }}>
        <Typography.Title level={5}>Config</Typography.Title>
        <ConfigTab capability={capability} />
      </div>

      <div id="ugs-capability-logs" style={{ marginTop: 24 }}>
        <Typography.Title level={5}>Logs</Typography.Title>
        <LogsTab capability={capability} />
      </div>
    </div>
  );
});

export default CapabilityDrawerContent;
