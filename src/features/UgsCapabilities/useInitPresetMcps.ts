// UGS-MODIFY: UGS-016 预置 MCP 自动安装 hook
import { pluginSelectors } from '@/store/tool/slices/plugin/selectors';
import { useToolStore } from '@/store/tool';
import { useEffect, useRef } from 'react';

import { UGS_PRESET_MCPS } from './presetMcps';

/**
 * 自动安装预置 MCP Server（NeqSim + pyResToolbox）
 * 在能力中心页面首次加载时执行一次
 * 已安装的会跳过
 */
export const useInitPresetMcps = () => {
  const installedPlugins = useToolStore(pluginSelectors.installedPlugins);
  const installCustomPlugin = useToolStore((s) => s.installCustomPlugin);
  const syncPluginTools = useToolStore((s) => s.syncPluginTools);
  const fetchConnectors = useToolStore((s) => s.fetchConnectors);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (refreshingRef.current) return;

    const installedIds = new Set(installedPlugins.map((p) => p.identifier));
    const missing = UGS_PRESET_MCPS.filter((mcp) => !installedIds.has(mcp.identifier));

    if (missing.length === 0) return;

    refreshingRef.current = true;
    // 异步安装缺失的预置 MCP
    (async () => {
      const newlyInstalled: string[] = [];
      for (const mcp of missing) {
        try {
          await installCustomPlugin(mcp);
          newlyInstalled.push(mcp.identifier);
          console.log(`[UgsCapabilities] 预置 MCP 已安装: ${mcp.identifier}`);
        } catch (err) {
          console.warn(`[UgsCapabilities] 预置 MCP 安装失败: ${mcp.identifier}`, err);
        }
      }

      // 为每个新安装的预置 MCP 创建 connector 记录，确保能力中心列表正确展示
      for (const identifier of newlyInstalled) {
        try {
          await syncPluginTools(identifier);
          console.log(`[UgsCapabilities] 预置 MCP connector 已同步: ${identifier}`);
        } catch (err) {
          console.warn(`[UgsCapabilities] 预置 MCP connector 同步失败: ${identifier}`, err);
        }
      }

      // 刷新 connectors 列表
      await fetchConnectors();

      refreshingRef.current = false;
    })();
  }, [installedPlugins, installCustomPlugin]);
};
