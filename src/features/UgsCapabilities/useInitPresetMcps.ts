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
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (refreshingRef.current) return;

    const installedIds = new Set(installedPlugins.map((p) => p.identifier));
    const missing = UGS_PRESET_MCPS.filter((mcp) => !installedIds.has(mcp.identifier));

    if (missing.length === 0) return;

    refreshingRef.current = true;
    // 异步安装缺失的预置 MCP
    (async () => {
      for (const mcp of missing) {
        try {
          await installCustomPlugin(mcp);
          console.log(`[UgsCapabilities] 预置 MCP 已安装: ${mcp.identifier}`);
        } catch (err) {
          console.warn(`[UgsCapabilities] 预置 MCP 安装失败: ${mcp.identifier}`, err);
        }
      }
      refreshingRef.current = false;
    })();
  }, [installedPlugins, installCustomPlugin]);
};
