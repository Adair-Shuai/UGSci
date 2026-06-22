/**
 * UGSci Desktop — Unified Build Configuration
 *
 * 所有平台的构建参数、依赖列表、环境默认值集中管理于此文件。
 * build.mjs 读取此配置后按当前平台、渠道、模式组合执行构建。
 *
 * 约定：
 *   - PLATFORMS 定义已知目标平台及其特征
 *   - CHANNELS 定义发布渠道的元数据
 *   - NATIVE_MODULES 按平台声明原生模块
 *   - RESOLVED_ALIASES 声明必须从 pnpm symlink 提升为真实目录的包
 *
 * @module build.config
 */

// ─────────────────────────────────────────────
// 1. 平台定义
// ─────────────────────────────────────────────

/**
 * 所有支持的目标平台。键为 os.platform() 返回值。
 * @typedef {Object} PlatformConfig
 * @property {string} label - 人可读标签
 * @property {string} packageCmd - electron-builder 平台参数
 * @property {string} exeExtension - 可执行文件后缀
 * @property {string} unpackedDirName - electron-builder --dir 输出子目录
 * @property {string} iconExt - 图标文件后缀
 * @property {string[]} buildTools - 平台特定的构建工具依赖
 * @property {string[]} nativeCompilers - 需要本机编译器的原生模块
 * @property {Object} env - 平台默认环境变量
 */

/** 所有支持的目标平台键列表 */
export const ALL_PLATFORMS = ['darwin', 'win32', 'linux'];

/** @type {Record<string, PlatformConfig>} */
export const PLATFORMS = {
  darwin: {
    label: 'macOS',
    packageCmd: '--mac',
    exeExtension: '.app',
    unpackedDirName: 'mac-arm64',
    iconExt: '.icns',
    buildTools: [],
    nativeCompilers: [],
    env: {
      CSC_IDENTITY_AUTO_DISCOVERY: 'false', // 本地构建默认不签名
    },
  },
  win32: {
    label: 'Windows',
    packageCmd: '--win',
    exeExtension: '.exe',
    unpackedDirName: 'win-unpacked',
    iconExt: '.ico',
    buildTools: [
      'Visual Studio Build Tools 2022 (含 C++ 桌面开发工作负载)',
      'Python 3.x (node-gyp 编译 C++ 原生模块)',
    ],
    nativeCompilers: [
      '@napi-rs/canvas',
      'get-windows',
      'node-screenshots',
    ],
    env: {
      // Windows 上强制使用 npm/node 的跨平台方式
      npm_config_msvs_version: '2022',
    },
  },
  linux: {
    label: 'Linux',
    packageCmd: '--linux',
    exeExtension: '',
    unpackedDirName: 'linux-unpacked',
    iconExt: '.png',
    buildTools: [],
    nativeCompilers: [],
    env: {},
  },
};

// ─────────────────────────────────────────────
// 2. 发布渠道定义
// ─────────────────────────────────────────────

/**
 * 发布渠道配置。
 * @typedef {Object} ChannelConfig
 * @property {string} iconPrefix - 图标文件前缀
 * @property {string} protocolScheme - URL 协议 scheme
 * @property {boolean} isPreRelease - 是否为预发布版
 * @property {string} label - 中文标签
 */

/** @type {Record<string, ChannelConfig>} */
export const CHANNELS = {
  stable: {
    iconPrefix: 'Icon',
    protocolScheme: 'lobehub',
    isPreRelease: false,
    label: '稳定版',
  },
  beta: {
    iconPrefix: 'Icon-beta',
    protocolScheme: 'lobehub',
    isPreRelease: true,
    label: '公测版',
  },
  nightly: {
    iconPrefix: 'Icon-nightly',
    protocolScheme: 'lobehub-nightly',
    isPreRelease: true,
    label: '每夜版',
  },
  canary: {
    iconPrefix: 'Icon',
    protocolScheme: 'lobehub-canary',
    isPreRelease: true,
    label: '金丝雀版',
  },
};

// ─────────────────────────────────────────────
// 3. 原生模块声明（按平台）
// ─────────────────────────────────────────────

/**
 * 各平台的原生模块清单。
 * 非当前平台的模块应被排除，避免 electron-builder 引入错误架构的 .node 文件。
 *
 * @param {'darwin'|'win32'|'linux'} platform
 * @returns {string[]}
 */
export function getNativeModules(platform) {
  const common = [
    '@napi-rs/canvas',
    'node-screenshots',
  ];

  const platformSpecific = {
    darwin: ['node-mac-permissions'],
    win32: ['get-windows'],
    linux: [],
  };

  return [...common, ...(platformSpecific[platform] || [])];
}

// ─────────────────────────────────────────────
// 4. pnpm 别名包（必须提升为真实目录）
// ─────────────────────────────────────────────

/**
 * pnpm 的别名功能会产生类似 strip-ansi-cjs 的虚拟包名。
 * 第三方包（如 @isaacs/cliui → gauge → wide-truncate）运行时通过
 * 原始包名 require，但 pnpm 的 symlink 树中只有别名。
 *
 * 必须在打包前将以下模块从 pnpm store 复制为真实顶层目录。
 *
 * @see LESSONS_LEARNED.md INC-011
 * @type {Array<{name: string, pnpmDir: string}>}
 */
export const RESOLVED_ALIASES = [
  { name: 'strip-ansi',   pnpmDir: 'strip-ansi@6.0.1' },
  { name: 'wrap-ansi',    pnpmDir: 'wrap-ansi@7.0.0' },
  { name: 'ansi-regex',   pnpmDir: 'ansi-regex@5.0.1' },
  { name: 'string-width', pnpmDir: 'string-width@4.2.3' },
];

// ─────────────────────────────────────────────
// 5. 外部运行时模块（Vite externalize）
// ─────────────────────────────────────────────

/**
 * 不能被打包进 Vite bundle、必须在 Electron 主进程中以 CommonJS
 * 动态加载的模块。
 *
 * @type {string[]}
 */
export const EXTERNAL_RUNTIME = [
  'electron-log',
];

// ─────────────────────────────────────────────
// 6. 构建产物校验清单
// ─────────────────────────────────────────────

/**
 * 验证打包产物完整性的检查项。
 * @param {'darwin'|'win32'|'linux'} platform
 * @param {string} unpackedDir - unpacked 产物目录绝对路径
 * @returns {Array<{label: string, pattern: string}>}
 */
export function getVerificationChecks(platform, unpackedDir) {
  const checks = [];

  if (platform === 'darwin') {
    checks.push(
      { label: '应用包 (.app)',   pattern: '*.app' },
      { label: 'app.asar (业务包)', pattern: '*.app/Contents/Resources/app.asar' },
      { label: 'asar.unpacked',   pattern: '*.app/Contents/Resources/app.asar.unpacked/node_modules' },
    );
  } else if (platform === 'win32') {
    checks.push(
      { label: 'LobeHub.exe (主入口)',          pattern: 'LobeHub.exe' },
      { label: 'app.asar (业务包)',              pattern: 'resources/app.asar' },
      { label: 'app.asar.unpacked (native)',     pattern: 'resources/app.asar.unpacked/node_modules' },
    );
  } else {
    checks.push(
      { label: '可执行文件',     pattern: 'lobehub' },
      { label: 'app.asar',       pattern: 'resources/app.asar' },
    );
  }

  return checks;
}

// ─────────────────────────────────────────────
// 7. 环境变量默认值
// ─────────────────────────────────────────────

/**
 * 构建所需的环境变量及其默认值。
 * 优先级：process.env > 此处默认值
 */
export const ENV_DEFAULTS = {
  NODE_OPTIONS: '--max-old-space-size=8192',
  UPDATE_CHANNEL: 'stable',
  ELECTRON_MIRROR: 'https://npmmirror.com/mirrors/electron/',
};

// ─────────────────────────────────────────────
// 8. 多平台构建策略
// ─────────────────────────────────────────────

/**
 * 跨平台构建能力矩阵。
 *
 * Electron 打包有三个层次，跨平台能力逐层递减：
 *   层级 1 — electron-vite build（代码编译）：完全跨平台，一份 dist/ 所有平台通用
 *   层级 2 — electron-builder --dir（解包产物）：部分交叉，macOS 可打 Linux/Windows
 *   层级 3 — electron-builder 安装器（dmg/nsis）：平台绑定，需原生环境
 *
 * @type {Record<string, {canCrossCompile: boolean, requiresDocker: boolean, note: string}>}
 */
export const CROSS_COMPILE_MATRIX = {
  'darwin→linux':  { canCrossCompile: true,  requiresDocker: true,  note: 'macOS + Docker 可打出 AppImage/deb/snap' },
  'darwin→win32':  { canCrossCompile: true,  requiresDocker: false, note: 'macOS + wine 可打出 NSIS 安装器' },
  'darwin→darwin': { canCrossCompile: true,  requiresDocker: false, note: '原生构建，最快' },
  'linux→darwin':  { canCrossCompile: false, requiresDocker: false, note: '不支持，macOS 需要 Xcode' },
  'linux→win32':   { canCrossCompile: true,  requiresDocker: false, note: 'wine 交叉编译' },
  'linux→linux':   { canCrossCompile: true,  requiresDocker: false, note: '原生构建' },
  'win32→darwin':  { canCrossCompile: false, requiresDocker: false, note: '不支持，macOS 需要 Xcode' },
  'win32→linux':   { canCrossCompile: true,  requiresDocker: true,  note: 'Docker 内构建 Linux 包' },
  'win32→win32':   { canCrossCompile: true,  requiresDocker: false, note: '原生构建' },
};

/**
 * 获知从当前平台可交叉编译到哪些平台。
 * @param {string} hostPlatform - 当前平台
 * @returns {string[]} 可交叉编译的目标平台列表
 */
export function getCrossCompileTargets(hostPlatform) {
  return Object.keys(PLATFORMS).filter(target => {
    if (target === hostPlatform) return true; // 原生总是可以
    const key = `${hostPlatform}→${target}`;
    return CROSS_COMPILE_MATRIX[key]?.canCrossCompile || false;
  });
}

/**
 * 多平台构建时，electron-vite build 产物的共享策略。
 *
 * electron-vite build 输出（dist/main/, dist/preload/, dist/renderer/）
 * 是纯 JS/HTML/CSS，与平台无关。一次编译，多平台复用。
 */
export const SHARED_BUILD_ARTIFACTS = {
  shared: ['dist/main/', 'dist/preload/', 'dist/renderer/'],
  perPlatform: [], // 原生模块在 electron-builder 阶段才引入
};

// ─────────────────────────────────────────────
// 9. 构建模式
// ─────────────────────────────────────────────

/**
 * 构建模式枚举。
 * @enum {string}
 */
export const BUILD_MODES = {
  /** 开发模式：electron-vite dev（热重载） */
  DEV: 'dev',
  /** 仅编译 TypeScript/Vite 产物 */
  BUILD: 'build',
  /** 完整打包（build + electron-builder） */
  PACKAGE: 'package',
  /** 仅验证已有产物 */
  VERIFY: 'verify',
  /** 清理构建目录 */
  CLEAN: 'clean',
};

/**
 * 各模式的 npm 脚本名称映射。
 * @type {Record<string, string>}
 */
export const MODE_SCRIPTS = {
  dev: 'dev',
  build: 'build:main',
  package: 'package:local',
};
