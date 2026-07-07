// UGS-MODIFY: UGS-016 预置 MCP 配置（NeqSim + pyResToolbox）
//
// 命令路径由服务端环境变量驱动，编译部署后管理员可在 .env 中随时修改并重启生效。
// 未配置对应环境变量的 MCP 不会出现在返回列表中（自动跳过安装）。
import type { UgsPresetMcpsConfig } from '@/types/serverConfig';
import type { LobeToolCustomPlugin } from '@/types/tool/plugin';

/**
 * 根据服务端环境变量配置构建预置 MCP 列表。
 *
 * 只有当对应的环境变量都已配置时，该 MCP 才会被包含在返回列表中。
 * 例如：NeqSim 需要 `neqsimJavaBin` 和 `neqsimJarPath` 同时设置。
 */
export const buildPresetMcps = (config?: UgsPresetMcpsConfig): LobeToolCustomPlugin[] => {
  if (!config) return [];

  const mcps: LobeToolCustomPlugin[] = [];

  // NeqSim PVT Engine — 需要 Java 可执行文件 + jar 路径
  if (config.neqsimJavaBin && config.neqsimJarPath) {
    mcps.push({
      customParams: {
        apiMode: 'simple',
        enableSettings: false,
        manifestMode: 'url',
        mcp: {
          args: ['-jar', config.neqsimJarPath],
          command: config.neqsimJavaBin,
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
    });
  }

  // pyResToolbox — 需要 fastmcp 可执行文件 + server.py 路径
  if (config.pyrestoolboxBin && config.pyrestoolboxServerPath) {
    mcps.push({
      customParams: {
        apiMode: 'simple',
        enableSettings: false,
        manifestMode: 'url',
        mcp: {
          args: ['run', config.pyrestoolboxServerPath],
          command: config.pyrestoolboxBin,
          type: 'stdio',
        },
      },
      identifier: 'pyrestoolbox-mcp',
      manifest: {
        api: [],
        identifier: 'pyrestoolbox-mcp',
        meta: {
          avatar: '⚙️',
          description:
            'pyResToolbox 储层工程工具箱，物质平衡、P/Z、递减曲线、IPR、节点分析、岩石力学',
          tags: ['储层工程', '物质平衡', 'IPR', 'pyResToolbox'],
          title: 'pyResToolbox Reservoir Engine',
        },
        type: 'mcp',
        version: '1.0.0',
      },
      type: 'customPlugin',
    });
  }

  return mcps;
};
