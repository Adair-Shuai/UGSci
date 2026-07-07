import { describe, expect, it, vi } from 'vitest';

import {
  filterToolIdsByCurrentEnv,
  isInstalledPluginAvailableInCurrentEnv,
  isToolAvailableInCurrentEnv,
} from './toolAvailability';

// Mock @lobechat/const so we can control isCustomBranding per test
vi.mock('@lobechat/const', () => ({
  get isCustomBranding() {
    return (globalThis as any).__isCustomBranding ?? false;
  },
  isDesktop: false,
}));

describe('toolAvailability', () => {
  afterEach(() => {
    (globalThis as any).__isCustomBranding = false;
  });

  it('should hide desktop-only builtin skills in web', () => {
    expect(
      filterToolIdsByCurrentEnv(['lobe-agent-browser', 'lobe-web-browsing'], { isDesktop: false }),
    ).toEqual(['lobe-web-browsing']);
  });

  it('should hide stdio mcp plugins in web (upstream behavior)', () => {
    expect(
      filterToolIdsByCurrentEnv(['local-mcp', 'remote-mcp'], {
        installedPlugins: [
          {
            customParams: { mcp: { type: 'stdio' } },
            identifier: 'local-mcp',
          },
        ],
        isDesktop: false,
      }),
    ).toEqual(['remote-mcp']);
  });

  // UGS-MODIFY: stdio MCP should be visible in self-hosted web environment
  it('should show stdio mcp plugins in self-hosted web', () => {
    (globalThis as any).__isCustomBranding = true;

    expect(
      filterToolIdsByCurrentEnv(['local-mcp', 'remote-mcp'], {
        installedPlugins: [
          {
            customParams: { mcp: { type: 'stdio' } },
            identifier: 'local-mcp',
          },
        ],
        isDesktop: false,
      }),
    ).toEqual(['local-mcp', 'remote-mcp']);
  });

  it('should keep deprecated tool ids visible for cleanup', () => {
    expect(filterToolIdsByCurrentEnv(['deleted-plugin'], { isDesktop: false })).toEqual([
      'deleted-plugin',
    ]);
  });

  it('should mark stdio mcp plugins as unavailable in web (upstream behavior)', () => {
    expect(
      isInstalledPluginAvailableInCurrentEnv(
        { customParams: { mcp: { type: 'stdio' } }, identifier: 'local-mcp' },
        { isDesktop: false },
      ),
    ).toBe(false);
  });

  // UGS-MODIFY: stdio MCP should be available in self-hosted web environment
  it('should mark stdio mcp plugins as available in self-hosted web', () => {
    (globalThis as any).__isCustomBranding = true;

    expect(
      isInstalledPluginAvailableInCurrentEnv(
        { customParams: { mcp: { type: 'stdio' } }, identifier: 'local-mcp' },
        { isDesktop: false },
      ),
    ).toBe(true);
  });

  it('should mark desktop-only builtin tools as unavailable in web when injected', () => {
    expect(
      isToolAvailableInCurrentEnv('lobe-agent-browser', {
        installedPlugins: [],
        isDesktop: false,
      }),
    ).toBe(false);
  });
});
