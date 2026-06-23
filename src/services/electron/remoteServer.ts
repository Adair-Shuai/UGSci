import { type DataSyncConfig, type MarketAuthorizationParams } from '@lobechat/electron-client-ipc';

import { ensureElectronIpc } from '@/utils/electron/ipc';

class RemoteServerService {
  /**
   * Get remote server configuration
   */
  getRemoteServerConfig = async () => {
    return ensureElectronIpc().remoteServer.getRemoteServerConfig();
  };

  /**
   * Set remote server configuration
   */
  setRemoteServerConfig = async (config: DataSyncConfig) => {
    return ensureElectronIpc().remoteServer.setRemoteServerConfig(config);
  };

  /**
   * Clear remote server configuration
   */
  clearRemoteServerConfig = async () => {
    return ensureElectronIpc().remoteServer.clearRemoteServerConfig();
  };

  /**
   * Request authorization
   */
  requestAuthorization = async (config: DataSyncConfig) => {
    return ensureElectronIpc().auth.requestAuthorization(config);
  };

  /**
   * Request Market authorization
   */
  requestMarketAuthorization = async (params: MarketAuthorizationParams) => {
    return ensureElectronIpc().auth.requestMarketAuthorization(params);
  };

  /**
   * Cancel authorization
   */
  cancelAuthorization = async () => {
    return ensureElectronIpc().auth.cancelAuthorization();
  };

  /**
   * Save an auth token obtained from the /api/auth/exchange endpoint.
   * Only callable in Electron — passes the token to the main process for gateway use.
   */
  saveAuthToken = async (params: { accessToken: string; expiresIn?: number }) => {
    return (ensureElectronIpc().remoteServer as any).saveAuthToken(params);
  };

  /**
   * Setup subscription webview session with OIDC token injection
   * This configures the webview partition session to inject authentication tokens
   * for requests to the official domain.
   * @param partition The partition name for the webview session
   */
  setupSubscriptionWebviewSession = async (partition: string) => {
    return ensureElectronIpc().remoteServer.setupSubscriptionWebviewSession({ partition });
  };
}

export const remoteServerService = new RemoteServerService();
