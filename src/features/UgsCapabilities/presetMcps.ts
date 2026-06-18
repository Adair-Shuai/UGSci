// UGS-MODIFY: UGS-016 预置 MCP 配置（NeqSim + pyResToolbox）
import type { LobeToolCustomPlugin } from '@/types/tool/plugin';

/**
 * UGSci 预置 MCP Server 配置
 * 这些 MCP 在能力中心首次加载时自动安装（如果尚未安装）
 */
export const UGS_PRESET_MCPS: LobeToolCustomPlugin[] = [
  {
    customParams: {
      apiMode: 'simple',
      enableSettings: false,
      manifestMode: 'url',
      mcp: {
        args: [
          '-jar',
          'C:\\Users\\shuai\\Documents\\neqsim\\neqsim-mcp-server\\target\\neqsim-mcp-server-1.0.0-SNAPSHOT-runner.jar',
        ],
        command: 'C:\\Users\\shuai\\.workbuddy\\binaries\\java\\versions\\21\\bin\\java.exe',
        type: 'stdio',
      },
    },
    identifier: 'neqsim-mcp-server',
    manifest: {
      api: [],
      identifier: 'neqsim-mcp-server',
      meta: {
        avatar: '🔬',
        description: 'NeqSim PVT 相态计算引擎，支持闪蒸、相包络线、压缩因子、黏度等',
        tags: ['PVT', '相态', 'NeqSim'],
        title: 'NeqSim PVT Engine',
      },
      type: 'mcp',
      version: '1.0.0',
    },
    type: 'customPlugin',
  },
  {
    customParams: {
      apiMode: 'simple',
      enableSettings: false,
      manifestMode: 'url',
      mcp: {
        args: [
          'run',
          'C:\\Users\\shuai\\Documents\\pyrestoolbox\\server.py',
        ],
        command: 'C:\\Users\\shuai\\Documents\\pyrestoolbox\\.venv\\Scripts\\fastmcp.exe',
        type: 'stdio',
      },
    },
    identifier: 'pyrestoolbox-mcp',
    manifest: {
      api: [],
      identifier: 'pyrestoolbox-mcp',
      meta: {
        avatar: '⚙️',
        description: 'pyResToolbox 储层工程工具箱，物质平衡、P/Z、递减曲线、IPR、节点分析、岩石力学',
        tags: ['储层工程', '物质平衡', 'IPR', 'pyResToolbox'],
        title: 'pyResToolbox Reservoir Engine',
      },
      type: 'mcp',
      version: '1.0.0',
    },
    type: 'customPlugin',
  },
];
