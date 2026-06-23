import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

import {
  copyExternalRuntimeModulesToSource,
  getExternalRuntimeModulesFilesConfig,
} from './external-runtime-deps.config.mjs';
import {
  copyNativeModules,
  copyNativeModulesToSource,
  getAsarUnpackPatterns,
  getNativeModulesFilesConfig,
} from './native-deps.config.mjs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const packageJSON = JSON.parse(await fs.readFile(path.join(__dirname, 'package.json'), 'utf8'));

const channel = process.env.UPDATE_CHANNEL;
const arch = os.arch();
const hasAppleCertificate = Boolean(process.env.CSC_LINK);

// 自定义更新服务器 URL (用于 stable 频道)
const updateServerUrl = process.env.UPDATE_SERVER_URL;

console.info(`🚄 Build Version ${packageJSON.version}, Channel: ${channel}`);
console.info(`🏗️ Building for architecture: ${arch}`);

// Channel identity derived solely from UPDATE_CHANNEL env var.
// Supported channels: stable, nightly, canary
const isStable = !channel || channel === 'stable';
const isNightly = channel === 'nightly';
const isCanary = channel === 'canary';

// Strip trailing channel path from URL for re-appending the correct channel
// Handles both base URL (https://cdn.example.com) and legacy URL with channel (https://cdn.example.com/stable)
const stripChannelSuffix = (url) => url.replace(/\/(stable|nightly|canary|beta)\/?$/, '');

// 根据 channel 配置 publish provider
// - 所有渠道 + UPDATE_SERVER_URL: 使用 generic (S3)
// - 无 UPDATE_SERVER_URL: 回退到 GitHub (本地开发)
const getPublishConfig = () => {
  const channelPath = isStable ? 'stable' : isNightly ? 'nightly' : channel || 'stable';

  if (updateServerUrl) {
    const baseUrl = stripChannelSuffix(updateServerUrl);
    const fullUrl = `${baseUrl}/${channelPath}`;
    console.info(`📦 ${channelPath} channel: Using generic provider (${fullUrl})`);
    return [
      {
        provider: 'generic',
        url: fullUrl,
      },
    ];
  }

  // 本地开发无 S3 时回退到 GitHub
  console.info(`📦 ${channelPath} channel: No UPDATE_SERVER_URL, falling back to GitHub provider`);
  return [
    {
      owner: 'Adair-Shuai',
      provider: 'github',
      repo: 'lobehub',
    },
  ];
};

// Keep only these Electron Framework localization folders (*.lproj)
// (aligned with previous Electron Forge build config)
const keepLanguages = new Set(['en', 'en_GB', 'en-US', 'en_US']);

// https://www.electron.build/code-signing-mac#how-to-disable-code-signing-during-the-build-process-on-macos
if (!hasAppleCertificate) {
  // Disable auto discovery to keep electron-builder from searching unavailable signing identities
  process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
  console.info('⚠️ Apple certificate link not found, macOS artifacts will be unsigned.');
}

// 根据版本类型确定协议 scheme
const getProtocolScheme = () => {
  if (isCanary) return 'ugsci-canary';
  if (isNightly) return 'ugsci-nightly';
  return 'ugsci';
};

const protocolScheme = getProtocolScheme();

// Determine icon file based on version type
const getIconFileName = () => {
  if (isStable || isCanary) return 'Icon';
  // nightly uses pre-release icon
  return 'Icon-nightly';
};

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration
 */
const config = {
  /**
   * BeforePack hook to resolve pnpm symlinks for native modules.
   * This ensures native modules are properly included in the asar archive.
   */
  beforePack: async () => {
    await copyNativeModulesToSource();
    await copyExternalRuntimeModulesToSource();

    console.info('📦 Downloading agent-browser binary...');
    execSync('node scripts/download-agent-browser.mjs', { stdio: 'inherit', cwd: __dirname });

    // Build and copy CLI bundle for embedding
    console.info('📦 Building CLI for embedding...');
    try {
      execSync('npm run build:cli', { stdio: 'inherit', cwd: __dirname });
      const cliSrc = path.resolve(__dirname, '../cli/dist/index.js');
      const cliDest = path.resolve(__dirname, 'resources/bin/lobe-cli.js');
      await fs.copyFile(cliSrc, cliDest);

      // Write a minimal package.json next to the CLI bundle so that
      // createRequire('../package.json') resolves correctly in the packaged app.
      const cliPkg = JSON.parse(
        await fs.readFile(path.resolve(__dirname, '../cli/package.json'), 'utf8'),
      );
      await fs.writeFile(
        path.resolve(__dirname, 'resources/cli-package.json'),
        JSON.stringify({ name: cliPkg.name, type: 'module', version: cliPkg.version }),
      );
      console.info('✅ CLI bundle copied to resources/bin/lobe-cli.js');
    } catch (cliErr) {
      console.warn('⚠️  CLI build failed, skipping (non-critical):', cliErr.message);
      // Create a minimal placeholder so the app doesn't crash on missing CLI
      await fs.mkdir(path.resolve(__dirname, 'resources/bin'), { recursive: true });
      await fs.writeFile(
        path.resolve(__dirname, 'resources/bin/lobe-cli.js'),
        '#!/usr/bin/env node\nconsole.log("CLI not available in local build");\n',
      );
      await fs.writeFile(
        path.resolve(__dirname, 'resources/cli-package.json'),
        JSON.stringify({ name: '@lobehub/cli', type: 'module', version: '0.0.0' }),
      );
      console.info('⚠️  CLI placeholder created');
    }
  },
  /**
   * AfterPack hook for post-processing:
   * 1. Copy native modules to asar.unpacked (resolving pnpm symlinks)
   * 2. Copy Liquid Glass Assets.car for macOS 26+
   * 3. Remove unused Electron Framework localizations
   *
   * @see https://github.com/electron-userland/electron-builder/issues/9254
   * @see https://github.com/MultiboxLabs/flow-browser/pull/159
   * @see https://github.com/electron/packager/pull/1806
   */
  afterPack: async (context) => {
    const isMac = ['darwin', 'mas'].includes(context.electronPlatformName);

    // Determine resources path based on platform
    let resourcesPath;
    if (isMac) {
      resourcesPath = path.join(
        context.appOutDir,
        `${context.packager.appInfo.productFilename}.app`,
        'Contents',
        'Resources',
      );
    } else {
      // Windows and Linux: resources is directly in appOutDir
      resourcesPath = path.join(context.appOutDir, 'resources');
    }

    // Copy native modules to asar.unpacked, resolving pnpm symlinks
    const unpackedNodeModules = path.join(resourcesPath, 'app.asar.unpacked', 'node_modules');
    await copyNativeModules(unpackedNodeModules);

    // macOS-specific post-processing
    if (!isMac) {
      return;
    }

    const iconFileName = getIconFileName();
    const assetsCarSource = path.join(__dirname, 'build', `${iconFileName}.Assets.car`);
    const assetsCarDest = path.join(resourcesPath, 'Assets.car');

    // Remove unused Electron Framework localizations to reduce app size
    // UGS-MODIFY: only strip localizations when a real certificate is available
    // — electron-builder re-signs the framework afterwards. Without a cert,
    // stripping .lproj breaks the framework's pre-existing signature, causing
    // macOS to report "已损坏" (damaged). We preserve lproj files so the
    // app shows "unidentified developer" instead — usable via right-click → Open.
    if (hasAppleCertificate) {
      const frameworkResourcePath = path.join(
        context.appOutDir,
        `${context.packager.appInfo.productFilename}.app`,
        'Contents',
        'Frameworks',
        'Electron Framework.framework',
        'Versions',
        'A',
        'Resources',
      );

      try {
        const entries = await fs.readdir(frameworkResourcePath);
        await Promise.all(
          entries.map(async (file) => {
            if (!file.endsWith('.lproj')) return;

            const lang = file.split('.')[0];
            if (keepLanguages.has(lang)) return;

            await fs.rm(path.join(frameworkResourcePath, file), { force: true, recursive: true });
          }),
        );
      } catch {
        // Non-critical: folder may not exist depending on packaging details
      }
    }

    try {
      await fs.access(assetsCarSource);
      await fs.copyFile(assetsCarSource, assetsCarDest);
      console.info(`✅ Copied Liquid Glass icon: ${iconFileName}.Assets.car`);
    } catch {
      // Non-critical: Assets.car not found or copy failed
      // App will use fallback .icns icon on all macOS versions
      console.info(`⏭️  Skipping Assets.car (not found or copy failed)`);
    }

    // UGS-MODIFY: Do NOT ad-hoc sign when there's no Apple certificate.
    // On modern macOS (26+), ad-hoc signing without hardened runtime also
    // triggers "已损坏" (damaged). Preserving Electron Framework's original
    // pre-signature and not deleting .lproj files (guarded above) yields
    // the milder "unidentified developer" notice that users can bypass
    // via right-click → Open.
    // Do nothing here — electron-builder's identity=null + Gatekeeper's
    // natural unsigned-app flow is the correct behavior without a cert.
  },
  appId: 'com.ugsci.ugsci-desktop',
  productName: 'UGSci',
  appImage: {
    artifactName: '${productName}-${version}.${ext}',
  },

  // Native modules must be unpacked from asar to work correctly
  asarUnpack: getAsarUnpackPatterns(),

  detectUpdateChannel: true,

  directories: {
    buildResources: 'build',
    output: 'release',
  },

  dmg: {
    artifactName: '${productName}-${version}-${arch}.${ext}',
    background: 'resources/dmg.png',
    contents: [
      { type: 'file', x: 150, y: 240 },
      { type: 'link', path: '/Applications', x: 450, y: 240 },
    ],
    iconSize: 80,
    window: {
      height: 400,
      width: 600,
    },
  },

  electronDownload: {
    mirror: 'https://npmmirror.com/mirrors/electron/',
  },

  files: [
    'dist',
    'resources',
    'dist/renderer/**/*',
    '!resources/locales',
    '!resources/dmg.png',
    // Exclude all node_modules first
    '!node_modules',
    // Then explicitly include native modules using object form (handles pnpm symlinks)
    ...getNativeModulesFilesConfig(),
    // Include non-native runtime modules that are intentionally externalized from Vite.
    ...getExternalRuntimeModulesFilesConfig(),
    // UGS-MODIFY: Force-include pnpm-aliased packages under their canonical names so
    // require('strip-ansi') / require('wrap-ansi') / require('string-width') resolves
    // at runtime. Without this, @isaacs/cliui's pnpm alias 'strip-ansi-cjs' would be the
    // only thing placed in asar under that family, breaking gauge/wide-truncate and others.
    // Must be a real top-level directory (not a symlink). See LESSONS_LEARNED.md INC-011.
    { from: 'node_modules/strip-ansi', to: 'node_modules/strip-ansi', filter: ['**/*'] },
    { from: 'node_modules/wrap-ansi', to: 'node_modules/wrap-ansi', filter: ['**/*'] },
    { from: 'node_modules/ansi-regex', to: 'node_modules/ansi-regex', filter: ['**/*'] },
    { from: 'node_modules/string-width', to: 'node_modules/string-width', filter: ['**/*'] },
  ],
  generateUpdatesFilesForAllChannels: true,
  linux: {
    category: 'Utility',
    icon: 'build/icon.png',
    maintainer: 'electronjs.org',
    target: ['AppImage', 'snap', 'deb', 'rpm', 'tar.gz'],
  },
  mac: {
    compression: 'maximum',
    icon: path.join(__dirname, 'build', 'Icon.icns'),
    entitlementsInherit: 'build/entitlements.mac.plist',
    extendInfo: {
      CFBundleIconName: 'AppIcon',
      CFBundleURLTypes: [
        {
          CFBundleURLName: 'UGSci Protocol',
          CFBundleURLSchemes: [protocolScheme],
        },
      ],
      NSAppleEventsUsageDescription:
        'Application needs to control System Settings to help you grant Full Disk Access automatically.',
      NSCameraUsageDescription: "Application requests access to the device's camera.",
      NSDocumentsFolderUsageDescription:
        "Application requests access to the user's Documents folder.",
      NSDownloadsFolderUsageDescription:
        "Application requests access to the user's Downloads folder.",
      NSMicrophoneUsageDescription: "Application requests access to the device's microphone.",
      NSScreenCaptureUsageDescription:
        'Application requests access to record and analyze screen content for AI assistance.',
    },
    gatekeeperAssess: false,
    hardenedRuntime: hasAppleCertificate,
    notarize: hasAppleCertificate,
    ...(hasAppleCertificate ? {} : { identity: null }),
    target: [
      { arch: [arch === 'arm64' ? 'arm64' : 'x64'], target: 'dmg' },
      { arch: [arch === 'arm64' ? 'arm64' : 'x64'], target: 'zip' },
    ],
  },
  npmRebuild: false,
  nsis: {
    allowToChangeInstallationDirectory: true,
    artifactName: '${productName}-${version}-setup.${ext}',
    createDesktopShortcut: 'always',
    oneClick: false,
    shortcutName: '${productName}',
    uninstallDisplayName: '${productName}',
  },
  protocols: [
    {
      name: 'UGSci Protocol',
      schemes: [protocolScheme],
    },
  ],
  publish: getPublishConfig(),

  // Release notes 配置
  // 可以通过环境变量 RELEASE_NOTES 传入，或从文件读取
  // 这会被写入 latest-mac.yml / latest.yml 中，供 generic provider 使用
  releaseInfo: {
    releaseNotes: process.env.RELEASE_NOTES || undefined,
  },

  extraResources: [
    { from: 'resources/bin', to: 'bin' },
    { from: 'resources/cli-package.json', to: 'package.json' },
  ],

  win: {
    executableName: 'UGSci',
  },
};

export default config;
