#!/usr/bin/env node
/**
 * UGSci Desktop — 统一跨平台构建脚本
 *
 * 用法（在 apps/desktop/ 下执行）：
 *   node scripts/build.mjs                    # 默认：build 模式（仅编译）
 *   node scripts/build.mjs --package          # 完整打包
 *   node scripts/build.mjs --package --nsis   # Windows NSIS 安装器
 *   node scripts/build.mjs --dev              # 开发模式（热重载）
 *   node scripts/build.mjs --verify           # 仅验证已有产物
 *   node scripts/build.mjs --clean            # 清理构建目录
 *   node scripts/build.mjs --help             # 查看帮助
 *
 * 高级选项：
 *   node scripts/build.mjs --package --channel=nightly  # 指定渠道
 *   node scripts/build.mjs --package --output dist/my   # 自定义输出
 *   node scripts/build.mjs --package --platform win32   # 交叉编译（实验性）
 *   node scripts/build.mjs --package --verbose          # 详细日志
 *   node scripts/build.mjs --package --skip-verify      # 跳过产物校验
 *
 * 设计目标：
 *   1. 单一入口 — 所有平台用同一个脚本
 *   2. 自动检测 — 无需手动指定当前平台
 *   3. 配置驱动 — 平台差异统一在 build.config.mjs 声明
 *   4. 经验编码 — INC-006~012 的所有教训内置进脚本
 *   5. 渐进增强 — 简单场景简单用，复杂场景可配置
 *
 * 关键经验（详见 LESSONS_LEARNED.md）：
 *   INC-006: Electron 二进制手动下载失败处理
 *   INC-007: ELECTRON_RUN_AS_NODE 环境变量泄漏
 *   INC-008: VS BuildTools state=-1 错误
 *   INC-009: EPERM rename / @electron/get 缓存枚举
 *   INC-010: pnpm 10 EMFILE → TraversalNodeModulesCollector
 *   INC-011: pnpm 别名 (strip-ansi-cjs) → 真实目录副本
 *   INC-012: Windows 残留文件锁 → 隔离输出目录 + 重试
 */

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PLATFORMS,
  CHANNELS,
  BUILD_MODES,
  ALL_PLATFORMS,
  RESOLVED_ALIASES,
  ENV_DEFAULTS,
  getNativeModules,
  getVerificationChecks,
  getCrossCompileTargets,
  CROSS_COMPILE_MATRIX,
} from './build.config.mjs';

// ─────────────────────────────────────────────
// 路径常量
// ─────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');   // apps/desktop
const repoRoot = path.resolve(projectRoot, '..', '..'); // UGSci/
const nodeModules = path.join(projectRoot, 'node_modules');
const pnpmStore = path.join(nodeModules, '.pnpm');
const distDir = path.join(projectRoot, 'dist');
const releaseDir = path.join(projectRoot, 'release');
const buildResources = path.join(projectRoot, 'build');

// ─────────────────────────────────────────────
// CLI 参数解析
// ─────────────────────────────────────────────

const HELP_TEXT = `
\x1b[1mUGSci Desktop — 统一跨平台构建脚本\x1b[0m

\x1b[36m用法:\x1b[0m  node scripts/build.mjs [模式] [选项]

\x1b[36m模式（互斥）:\x1b[0m
  --dev            开发模式，electron-vite dev + 热重载
  --build          仅编译 Vite 产物到 dist/（默认）
  --package        完整打包：编译 + electron-builder
  --package-all    一次编译 + 多平台打包（需 macOS 宿主机）
  --verify         仅验证已有产物（不构建）
  --clean          清理 dist/ 和 release/ 目录

\x1b[36m多平台打包（与 --package 或 --package-all 配合）:\x1b[0m
  --platform=all         为所有平台构建（编译层可共享，打包层按需交叉）
  --platform=darwin,linux 逗号分隔多平台（如: darwin,win32,linux）
  --cross                启用交叉编译（macOS → Linux/Windows）
  --no-package           仅编译 dist/ 不打包（与 --platform=all 配合）

\x1b[36m打包选项（与 --package 配合）:\x1b[0m
  --nsis           输出 Windows NSIS 安装器（否则为 --dir 模式）
  --dmg            输出 macOS DMG（否则为 --dir 模式）
  --channel=CH     发布渠道: stable|beta|nightly|canary（默认: stable）
  --output=DIR     产物输出目录（默认: release/）
  --skip-verify    打包后跳过产物完整性校验

\x1b[36m其他选项:\x1b[0m
  --platform=PLAT  目标平台: darwin|win32|linux|all（默认: 当前平台）
  --verbose        输出详细日志（命令执行、环境变量等）
  --skip-prepare   跳过环境检查与编译（需已有 dist/）
  --help           显示此帮助

\x1b[36m多平台示例:\x1b[0m
  node scripts/build.mjs --platform=all --build     # 一次编译，代码层面全平台通用
  node scripts/build.mjs --package-all              # macOS 上打出 mac + win + linux
  node scripts/build.mjs --platform=win32,linux --package --cross  # 交叉打包多目标
  node scripts/build.mjs --help                     # 查看所有选项
`;

function parseArgs(argv) {
  const flags = {
    mode: 'build',
    platform: os.platform(),
    platforms: [],        // 多平台列表
    channel: 'stable',
    output: null,
    nsis: false,
    dmg: false,
    cross: false,
    noPackage: false,
    skipPrepare: false,
    skipVerify: false,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--help':
      case '-h':
        console.log(HELP_TEXT);
        process.exit(0);

      case '--dev':
        flags.mode = BUILD_MODES.DEV;
        break;
      case '--build':
        flags.mode = BUILD_MODES.BUILD;
        break;
      case '--package':
        flags.mode = BUILD_MODES.PACKAGE;
        break;
      case '--package-all':
        flags.mode = BUILD_MODES.PACKAGE;
        flags.platform = 'all';
        break;
      case '--verify':
        flags.mode = BUILD_MODES.VERIFY;
        break;
      case '--clean':
        flags.mode = BUILD_MODES.CLEAN;
        break;

      case '--nsis':
        flags.nsis = true;
        break;
      case '--dmg':
        flags.dmg = true;
        break;
      case '--cross':
        flags.cross = true;
        break;
      case '--no-package':
        flags.noPackage = true;
        break;
      case '--skip-prepare':
        flags.skipPrepare = true;
        break;
      case '--skip-verify':
        flags.skipVerify = true;
        break;
      case '--verbose':
        flags.verbose = true;
        break;

      default:
        if (arg.startsWith('--channel=')) {
          flags.channel = arg.split('=')[1];
        } else if (arg.startsWith('--output=')) {
          flags.output = arg.split('=')[1];
        } else if (arg.startsWith('--platform=')) {
          const val = arg.split('=')[1];
          if (val === 'all') {
            flags.platform = 'all';
            flags.platforms = [...ALL_PLATFORMS];
          } else if (val.includes(',')) {
            flags.platform = 'multi';
            flags.platforms = val.split(',').map(s => s.trim()).filter(p => ALL_PLATFORMS.includes(p));
          } else {
            flags.platform = val;
            flags.platforms = [val];
          }
        }
        break;
    }
  }

  // 默认：当前平台
  if (flags.platforms.length === 0) {
    flags.platforms = [flags.platform];
  }

  return flags;
}

// ─────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const log = (...m) => console.log(colors.cyan + '[build]' + colors.reset, ...m);
const ok = (...m) => console.log(colors.green + '[  ✓  ]' + colors.reset, ...m);
const warn = (...m) => console.warn(colors.yellow + '[  !  ]' + colors.reset, ...m);
const err = (...m) => console.error(colors.red + '[  ✗  ]' + colors.reset, ...m);
const step = (n, total, name) =>
  console.log(`\n${colors.bold}${colors.magenta}━━━ Step ${n}/${total}: ${name} ━━━${colors.reset}`);

const fileExists = (p) => {
  try { fs.accessSync(p); return true; } catch { return false; }
};
const dirExists = (p) => {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
};

function run(cmd, opts = {}) {
  if (opts._verbose) log('exec:', cmd);
  try {
    return execSync(cmd, {
      stdio: opts.silent ? 'pipe' : 'inherit',
      cwd: opts.cwd || projectRoot,
      ...opts,
    });
  } catch (e) {
    if (opts.allowFail) return e.stdout || e.stderr || '';
    throw e;
  }
}

/** 可选的异步 spawn，适合长时间运行的命令（如 dev server） */
function spawnAsync(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: opts.cwd || projectRoot,
      shell: true,
      ...opts,
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`进程退出码: ${code}`));
    });
    child.on('error', reject);
  });
}

// ─────────────────────────────────────────────
// Step 1: 环境检查
// ─────────────────────────────────────────────

async function envCheck(flags) {
  const platform = PLATFORMS[flags.platform];
  if (!platform) throw new Error(`不支持的平台: ${flags.platform}`);

  log(`当前平台: ${platform.label} (${os.arch()})`);
  log(`发布渠道: ${CHANNELS[flags.channel]?.label || flags.channel}`);

  // INC-007: 清除 ELECTRON_RUN_AS_NODE 泄漏
  if (process.env.ELECTRON_RUN_AS_NODE) {
    delete process.env.ELECTRON_RUN_AS_NODE;
    warn('已 unset ELECTRON_RUN_AS_NODE（防 INC-007）');
  }

  // 设置环境变量默认值
  for (const [key, val] of Object.entries(ENV_DEFAULTS)) {
    if (!process.env[key]) {
      process.env[key] = val;
      if (flags.verbose) log(`env ${key}=${val} (默认)`);
    }
  }

  // 检查 Node.js 版本
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (major < 20) {
    throw new Error(`Node.js 版本过低: ${nodeVersion}。需要 ≥ 20.x`);
  }
  ok(`Node.js ${nodeVersion}`);

  // 检查 pnpm（首选）或 npm
  let pm = 'npm';
  try {
    execSync('pnpm --version', { stdio: 'pipe' });
    pm = 'pnpm';
  } catch {}
  ok(`包管理器: ${pm}`);

  // 确保依赖已安装
  if (!dirExists(nodeModules)) {
    throw new Error('node_modules 不存在，请先运行 pnpm install');
  }

  // 平台特定检查
  if (flags.platform === 'win32') {
    await windowsEnvCheck(flags);
  } else if (flags.platform === 'darwin') {
    await macEnvCheck(flags);
  }

  ok('环境检查通过');
}

async function windowsEnvCheck(flags) {
  // INC-008: 检查 VS BuildTools / Windows SDK
  const vsWhere = 'C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe';
  // 在非 Windows 上此检查跳过
  if (flags.platform !== 'win32') return;

  // 此处仅在 Windows 宿主机上执行
  try {
    const out = execSync(
      `"${vsWhere}" -latest -property installationPath`,
      { stdio: 'pipe', encoding: 'utf8' },
    ).trim();
    if (out) {
      ok(`Visual Studio: ${out}`);
    }
  } catch {
    warn('未检测到 Visual Studio Build Tools（INC-008）。');
    warn('  请安装 Visual Studio 2022 Build Tools，选择"使用 C++ 的桌面开发"工作负载。');
    warn('  详见 BUILD.md → Windows 平台前置条件');
  }
}

async function macEnvCheck(flags) {
  // macOS 检查 Xcode CLI tools
  try {
    const out = execSync('xcode-select -p', { stdio: 'pipe', encoding: 'utf8' }).trim();
    if (out) ok(`Xcode CLI: ${out}`);
  } catch {
    warn('未检测到 Xcode Command Line Tools。');
    warn('  请运行: xcode-select --install');
  }
}

// ─────────────────────────────────────────────
// Step 2: 确保 Electron 二进制就绪
// ─────────────────────────────────────────────

async function ensureElectronBinary(flags) {
  // INC-006: Electron 二进制可能因网络问题未下载
  const electronModule = path.join(nodeModules, 'electron');
  if (!dirExists(electronModule)) {
    warn('Electron 包缺失，正在重新安装…');
    run('pnpm install electron', { cwd: projectRoot });
  }

  const electronDist = path.join(electronModule, 'dist');
  if (!dirExists(electronDist)) {
    warn('Electron 二进制缺失，正在手动下载（INC-006）…');
    try {
      const installScript = path.join(electronModule, 'install.js');
      if (fileExists(installScript)) {
        run(`node "${installScript}"`, { cwd: projectRoot });
      }
    } catch (e) {
      warn(`Electron install.js 失败: ${e.message}`);
      warn('将尝试通过 electron-builder 自动下载（国内镜像 npmmirror.com）');
    }
  }

  if (dirExists(electronDist)) {
    ok('Electron 二进制就绪');
  } else {
    warn('Electron 二进制未就绪，将在构建时自动下载');
  }
}

// ─────────────────────────────────────────────
// Step 3: 准备 pnpm 兼容模块（INC-011）
// ─────────────────────────────────────────────

async function preparePnpmAliases(flags) {
  log('复制 pnpm 别名模块到顶层 node_modules（INC-011）');
  let copied = 0;

  for (const alias of RESOLVED_ALIASES) {
    const src = path.join(pnpmStore, alias.pnpmDir, 'node_modules', alias.name);
    const dest = path.join(nodeModules, alias.name);

    if (!dirExists(src)) {
      if (flags.verbose) log(`  跳过 ${alias.name}（源不存在）`);
      continue;
    }

    // 如果是 symlink，删除之
    try {
      const stat = fs.lstatSync(dest);
      if (stat.isSymbolicLink()) fs.unlinkSync(dest);
    } catch {}

    // 删除旧目录并重新复制
    await fsp.rm(dest, { recursive: true, force: true });
    await copyDirRecursive(src, dest);
    copied++;
  }

  ok(`已复制 ${copied}/${RESOLVED_ALIASES.length} 个别名模块`);
}

async function copyDirRecursive(src, dst) {
  await fsp.mkdir(dst, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const sp = path.join(src, e.name);
    const dp = path.join(dst, e.name);
    if (e.isDirectory()) {
      await copyDirRecursive(sp, dp);
    } else if (e.isSymbolicLink()) {
      const real = await fsp.realpath(sp);
      const realStat = await fsp.stat(real);
      if (realStat.isDirectory()) {
        await copyDirRecursive(real, dp);
      } else {
        await fsp.copyFile(real, dp);
      }
    } else {
      await fsp.copyFile(sp, dp);
    }
  }
}

// ─────────────────────────────────────────────
// Step 4: 构建 electron-vite 产物
// ─────────────────────────────────────────────

function buildElectronVite(flags) {
  const electronViteBin = path.join(nodeModules, 'electron-vite', 'bin', 'electron-vite.js');
  if (!fileExists(electronViteBin)) {
    throw new Error('找不到 electron-vite。请确保已安装依赖: pnpm install');
  }

  const nodeOptions = process.env.NODE_OPTIONS || '--max-old-space-size=8192';
  log(`NODE_OPTIONS=${nodeOptions} electron-vite build`);
  run(`node "${electronViteBin}" build`, {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
      UPDATE_CHANNEL: flags.channel,
    },
  });

  ok('dist/ 已生成');
}

// ─────────────────────────────────────────────
// Step 5: electron-builder 打包
// ─────────────────────────────────────────────

function runElectronBuilder(flags) {
  const platform = PLATFORMS[flags.platform];
  const builderCli = path.join(nodeModules, 'electron-builder', 'out', 'cli', 'cli.js');
  const electronDist = path.join(nodeModules, 'electron', 'dist');

  if (!fileExists(builderCli)) {
    throw new Error('找不到 electron-builder CLI');
  }

  // 确定输出目录（INC-012: 隔离输出避免文件锁）
  const isDirMode = !flags.nsis && !flags.dmg;
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const baseOutput = flags.output || releaseDir;
  const builderOutput = isDirMode
    ? path.join(baseOutput + '__building-' + stamp)  // 隔离临时目录
    : baseOutput;

  const args = [
    `node "${builderCli}"`,
    flags.nsis ? '--win' : flags.dmg ? '--mac' : '--dir',
    '--config electron-builder.mjs',
    `-c.electronDist="${electronDist}"`,
  ];

  // 本地构建默认不签名
  if (!process.env.CSC_LINK) {
    args.push('-c.mac.notarize=false', '-c.mac.identity=null');
  }

  if (isDirMode) {
    args.push(`-c.directories.output="${builderOutput}"`);
  }

  if (flags.nsis || flags.dmg) {
    args.push('--publish never');
  }

  // 渠道环境变量
  const env = {
    ...process.env,
    UPDATE_CHANNEL: flags.channel,
  };

  log(`electron-builder 参数: ${args.join(' ')}`);
  run(args.join(' '), { cwd: projectRoot, env });

  return { builderOutput, finalOutput: baseOutput };
}

// ─────────────────────────────────────────────
// Step 6: 搬迁产物（INC-012 文件锁处理）
// ─────────────────────────────────────────────

async function commitOutput(builderOutput, finalOutput, flags) {
  if (!dirExists(builderOutput)) return;

  log(`搬迁产物: ${path.relative(repoRoot, builderOutput)} → ${path.relative(repoRoot, finalOutput)}`);

  // 如果旧产物存在，重命名为 .old-{timestamp}
  if (dirExists(finalOutput)) {
    const old = finalOutput + '.old-' + Date.now();
    try {
      await fsp.rename(finalOutput, old);
    } catch (e) {
      // rename 失败时用 copy（Windows 上可能有锁）
      await fsp.cp(finalOutput, old, { recursive: true });
      try { await fsp.rm(finalOutput, { recursive: true, force: true }); } catch {}
    }
  }

  // 优先 rename（快速）
  try {
    await fsp.rename(builderOutput, finalOutput);
    ok('产物已就位（rename）');
    return;
  } catch (e) {
    warn('rename 失败，改用 copy:', e.code);
  }

  // 回退到 copy
  await fsp.cp(builderOutput, finalOutput, { recursive: true });
  ok('产物已就位（copy）');

  // 清理临时目录（重试最多 10 次，每次等 3 秒）
  for (let i = 0; i < 10; i++) {
    try {
      await fsp.rm(builderOutput, { recursive: true, force: true });
      break;
    } catch {
      if (i < 9) await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// ─────────────────────────────────────────────
// Step 7: 验证产物完整性
// ─────────────────────────────────────────────

async function verifyBuild(outputDir, flags) {
  const platform = PLATFORMS[flags.platform];

  // 确定 unpacked 目录
  let unpackedDir;
  if (flags.platform === 'darwin') {
    // electron-builder --dir 输出 release/mac/
    unpackedDir = path.join(outputDir, platform.unpackedDirName);
  } else if (flags.platform === 'win32') {
    unpackedDir = path.join(outputDir, platform.unpackedDirName);
  } else {
    unpackedDir = path.join(outputDir, platform.unpackedDirName);
  }

  if (!dirExists(unpackedDir)) {
    // 尝试直接在 outputDir 找
    unpackedDir = outputDir;
  }

  log(`验证目录: ${path.relative(repoRoot, unpackedDir)}`);

  const checks = getVerificationChecks(flags.platform, unpackedDir);

  for (const check of checks) {
    const fullPath = path.join(unpackedDir, check.pattern);
    // 对于通配符模式，使用 glob
    const matched = resolveGlob(unpackedDir, check.pattern);
    if (matched.length === 0) {
      throw new Error(`产物缺失: ${check.label}（未找到 ${check.pattern}）`);
    }
    const stat = await fsp.stat(matched[0]);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
    ok(`${check.label}: ${sizeMB} MB (${path.relative(unpackedDir, matched[0])})`);
  }

  // 校验 .node 原生模块数量
  await verifyNativeModules(unpackedDir, flags);
}

function resolveGlob(baseDir, pattern) {
  // Supports patterns like: *.ext, *.app/Contents/Resources/app.asar
  // Uses fs.globSync (Node.js 22+) for recursive matching
  try {
    const full = path.join(baseDir, pattern);
    // Try direct path first (no glob needed)
    if (fileExists(full)) return [full];
    // Use Node.js 22+ globSync for patterns with wildcards
    const results = fs.globSync(full);
    return results.map(f => path.resolve(f));
  } catch {
    // Fallback: if globSync not available, try readdir
    if (pattern.includes('/') || pattern.includes(path.sep)) {
      return [];
    }
    if (pattern.includes('*')) {
      const ext = path.extname(pattern);
      try {
        return fs.readdirSync(baseDir)
          .filter(f => f.endsWith(ext))
          .map(f => path.join(baseDir, f));
      } catch {
        return [];
      }
    }
  }
  return [];
}

async function verifyNativeModules(unpackedDir, flags) {
  const expectedNative = getNativeModules(flags.platform);
  const asarUnpacked = findFile(unpackedDir, 'app.asar.unpacked');

  if (!asarUnpacked) {
    warn('未找到 app.asar.unpacked，跳过原生模块校验');
    return;
  }

  // 统计 .node 文件
  const nodeFiles = findAllFiles(asarUnpacked, /\.node$/);
  ok(`原生模块 (.node): ${nodeFiles.length} 个`);

  if (nodeFiles.length < expectedNative.length) {
    warn(`原生 .node 数量 (${nodeFiles.length}) 少于预期 (${expectedNative.length})`);
    warn('预期模块: ' + expectedNative.join(', '));
  }

  // 校验关键模块在 asar 内
  const asarFile = findFile(unpackedDir, 'app.asar');
  if (asarFile) {
    await verifyAsarContents(asarFile, flags);
  }
}

async function verifyAsarContents(asarFile, flags) {
  // 尝试多种 asar 工具路径
  const asarToolCandidates = [
    path.join(nodeModules, '.pnpm', '@electron+asar@3.4.1', 'node_modules', '@electron', 'asar', 'bin', 'asar.js'),
    path.join(nodeModules, '@electron', 'asar', 'bin', 'asar.js'),
    path.join(nodeModules, 'asar', 'bin', 'asar.js'),
  ];
  const asarTool = asarToolCandidates.find(p => fileExists(p));

  if (!asarTool) {
    warn('asar 工具未找到，跳过 asar 内容校验');
    return;
  }

  try {
    const list = execSync(`node "${asarTool}" list "${asarFile}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const critical = ['strip-ansi', 'wrap-ansi', 'string-width', 'ansi-regex', 'gauge', 'electron-log'];
    const missing = critical.filter(m =>
      !list.includes(`node_modules\\${m}\\`) && !list.includes(`node_modules/${m}/`),
    );

    if (missing.length > 0) {
      throw new Error(`asar 缺少关键模块: ${missing.join(', ')}`);
    }
    ok('关键模块在 asar 中验证通过');
  } catch (e) {
    warn(`asar 校验异常: ${e.message}`);
  }
}

function findFile(baseDir, name) {
  try {
    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      const p = path.join(baseDir, entry.name);
      if (entry.name === name) return p;
      if (entry.isDirectory()) {
        const found = findFile(p, name);
        if (found) return found;
      }
    }
  } catch {}
  return null;
}

function findAllFiles(baseDir, pattern) {
  const results = [];
  try {
    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      const p = path.join(baseDir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findAllFiles(p, pattern));
      } else if (pattern.test(entry.name)) {
        results.push(p);
      }
    }
  } catch {}
  return results;
}

// ─────────────────────────────────────────────
// 清理
// ─────────────────────────────────────────────

async function cleanBuild() {
  const dirs = [distDir, releaseDir];
  for (const d of dirs) {
    if (dirExists(d)) {
      await fsp.rm(d, { recursive: true, force: true });
      ok(`已清理: ${path.relative(repoRoot, d)}`);
    }
  }
  // 清理旧的隔离临时目录
  try {
    const entries = await fsp.readdir(projectRoot);
    for (const e of entries) {
      if (e.startsWith('release__building-') || e.startsWith('build/desktop__building-')) {
        await fsp.rm(path.join(projectRoot, e), { recursive: true, force: true });
      }
    }
  } catch {}
  ok('清理完成');
}

// ─────────────────────────────────────────────
// 多平台构建调度
// ─────────────────────────────────────────────

/**
 * 对多个平台执行构建/打包。
 *
 * 策略：
 *   层级 1：electron-vite build 只执行一次（代码产物跨平台共享）
 *   层级 2：electron-builder 对每个平台执行 --dir 打包
 *   层级 3：跨平台打包能力矩阵见 build.config.mjs CROSS_COMPILE_MATRIX
 *
 * @param {Object} baseFlags - 共享的命令行参数
 */
async function buildForPlatforms(baseFlags) {
  const hostPlatform = os.platform();
  const targets = baseFlags.platforms;
  const platformCount = targets.length;

  console.log(`\n${colors.bold}${colors.cyan}📦 多平台构建: ${targets.length} 个目标${colors.reset}`);
  console.log(`${colors.dim}宿主机: ${PLATFORMS[hostPlatform]?.label || hostPlatform}${colors.reset}`);

  // ── 检查交叉编译可行性 ──
  const crossTargets = getCrossCompileTargets(hostPlatform);

  for (const tgt of targets) {
    if (!crossTargets.includes(tgt) && tgt !== hostPlatform) {
      const matrixKey = `${hostPlatform}→${tgt}`;
      const info = CROSS_COMPILE_MATRIX[matrixKey];
      if (info && !info.canCrossCompile) {
        err(`无法从 ${PLATFORMS[hostPlatform].label} 交叉编译到 ${PLATFORMS[tgt].label}: ${info.note}`);
        err(`  请使用 CI 矩阵构建或在该平台上原生构建。`);
        process.exit(1);
      }
      warn(`${PLATFORMS[hostPlatform].label} → ${PLATFORMS[tgt].label} 交叉编译可能失败，将尽力尝试`);
    }
  }
  console.log('');

  // ── Step A: 共享的环境检查 ──
  if (!baseFlags.skipPrepare) {
    log('执行共享环境检查…');
    // 使用宿主平台做检查
    const hostFlags = { ...baseFlags, platform: hostPlatform };
    await envCheck(hostFlags);
    await ensureElectronBinary(hostFlags);
  }

  // ── Step B: 编译一次，所有平台复用 ──
  if (!baseFlags.skipPrepare) {
    step(1, '2+N', 'electron-vite build（一次编译，多平台复用）');
    buildElectronVite(baseFlags);
    console.log(`${colors.dim}  dist/main/, dist/preload/, dist/renderer/ — 纯 JS/HTML/CSS，跨平台通用${colors.reset}\n`);
  }

  // ── Step C: pnpm 别名准备（跨平台通用） ──
  if (!baseFlags.skipPrepare) {
    await preparePnpmAliases(baseFlags);
  }

  if (baseFlags.noPackage) {
    console.log(`\n${colors.bold}${colors.green}✅ 代码编译完成！dist/ 可用于所有平台。${colors.reset}`);
    console.log(`${colors.dim}  在目标平台运行 node scripts/build.mjs --package --skip-prepare 即可打包${colors.reset}\n`);
    return;
  }

  // ── Step D: 逐平台打包 ──
  console.log(`${colors.bold}${colors.cyan}⚙️  开始逐平台打包…${colors.reset}\n`);

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const tgt = targets[i];
    const plat = PLATFORMS[tgt];
    const isCross = tgt !== hostPlatform;
    const crossLabel = isCross ? ` (交叉编译)` : '';

    step(i + 1, targets.length, `${plat.label} 打包${crossLabel}`);

    // 为每个平台创建独立的 flags
    const tgtFlags = {
      ...baseFlags,
      platform: tgt,
      skipPrepare: true,   // 已编译完成
      skipVerify: baseFlags.skipVerify,
      output: path.join(baseFlags.output || releaseDir, tgt),
      verbose: baseFlags.verbose,
    };

    // 平台特定 electron-builder 参数
    if (tgt === 'darwin') {
      tgtFlags.nsis = false;
      tgtFlags.dmg = baseFlags.dmg || false;
    } else if (tgt === 'win32') {
      tgtFlags.nsis = baseFlags.nsis || false;
      tgtFlags.dmg = false;
    } else {
      tgtFlags.nsis = false;
      tgtFlags.dmg = false;
    }

    try {
      // 交叉编译时设置平台环境变量
      const extraEnv = {};
      if (isCross) {
        // 告知 native-deps.config.mjs 目标平台
        extraEnv.npm_config_platform = tgt;
        extraEnv.npm_config_arch = os.arch();
        log(`  交叉编译环境: npm_config_platform=${tgt}`);
      }

      const origEnv = { ...process.env };
      Object.assign(process.env, extraEnv);

      const result = runElectronBuilder(tgtFlags);

      // 恢复环境变量
      for (const key of Object.keys(extraEnv)) {
        if (key in origEnv) process.env[key] = origEnv[key];
        else delete process.env[key];
      }

      // 搬迁产物
      if (result.builderOutput && result.builderOutput !== result.finalOutput) {
        await commitOutput(result.builderOutput, result.finalOutput, tgtFlags);
      }

      // 跳过验证时也做基本检查
      if (tgtFlags.skipVerify) {
        const outDir = result.finalOutput || path.join(releaseDir, tgt);
        if (dirExists(outDir)) {
          ok(`${plat.label} 打包完成 → ${path.relative(repoRoot, outDir)}`);
        }
      } else {
        await verifyBuild(result.finalOutput || path.join(releaseDir, tgt), tgtFlags);
      }

      results.push({ platform: tgt, success: true, output: result.finalOutput });
      successCount++;
    } catch (e) {
      err(`${plat.label} 打包失败: ${e.message}`);
      results.push({ platform: tgt, success: false, error: e.message });
      failCount++;
    }
  }

  // ── 汇总报告 ──
  console.log(`\n${colors.bold}${'═'.repeat(50)}${colors.reset}`);
  console.log(`${colors.bold}多平台构建报告${colors.reset}`);
  console.log(`${colors.bold}${'═'.repeat(50)}${colors.reset}`);

  for (const r of results) {
    const icon = r.success ? '✅' : '❌';
    const platformName = PLATFORMS[r.platform]?.label || r.platform;
    console.log(`  ${icon} ${platformName}: ${r.success ? path.relative(repoRoot, r.output) : r.error}`);
  }

  console.log(`\n${colors.bold}结果: ${successCount}/${targets.length} 成功${failCount > 0 ? `, ${failCount} 失败` : ''}${colors.reset}`);

  if (failCount > 0) {
    console.log(`\n${colors.yellow}提示: 交叉编译失败是正常的。建议:${colors.reset}`);
    console.log(`  1. 使用 CI 矩阵构建 (GitHub Actions) — 原生平台，最可靠`);
    console.log(`  2. 在目标平台原生构建: npm run desktop:package`);
    console.log(`  3. 查看 BUILD.md → "多平台构建" 章节了解详情`);
  }

  console.log('');
}

// ─────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────

async function main() {
  const flags = parseArgs(process.argv.slice(2));

  // 打印头部
  const isMultiPlatform = flags.platforms.length > 1;
  const platformLabel = isMultiPlatform
    ? `${flags.platforms.length} 个平台 (${flags.platforms.map(p => PLATFORMS[p]?.label).join(', ')})`
    : PLATFORMS[flags.platform]?.label || flags.platform;

  console.log(`\n${colors.bold}🚀 UGSci Desktop — 统一构建脚本${colors.reset}`);
  console.log(`${colors.dim}平台: ${platformLabel} | 渠道: ${CHANNELS[flags.channel]?.label || flags.channel} | 模式: ${flags.mode}${colors.reset}\n`);

  // ── 清理模式 ──
  if (flags.mode === BUILD_MODES.CLEAN) {
    await cleanBuild();
    return;
  }

  // ── 验证模式 ──
  if (flags.mode === BUILD_MODES.VERIFY) {
    const output = flags.output || releaseDir;
    if (!dirExists(output)) throw new Error(`产物目录不存在: ${output}`);
    await verifyBuild(output, flags);
    console.log(`\n${colors.bold}${colors.green}✅ 验证通过！${colors.reset}\n`);
    return;
  }

  // ── 开发模式 ──
  if (flags.mode === BUILD_MODES.DEV) {
    log('启动 electron-vite dev（热重载）…');
    const electronViteBin = path.join(nodeModules, 'electron-vite', 'bin', 'electron-vite.js');

    // pnpm 下 electron-vite 的 createRequire 可能解析到不同版本的 electron，
    // 导致 getElectronPath() 找不到二进制。这里直接定位到 apps/desktop 自己的 electron。
    if (!process.env.ELECTRON_EXEC_PATH) {
      const electronDist = path.join(projectRoot, 'node_modules', 'electron', 'dist');
      if (dirExists(electronDist)) {
        const pathTxt = path.join(electronDist, '..', 'path.txt');
        if (fileExists(pathTxt)) {
          const exe = fs.readFileSync(pathTxt, 'utf8').trim();
          const fullPath = path.join(electronDist, exe);
          if (fileExists(fullPath)) {
            process.env.ELECTRON_EXEC_PATH = fullPath;
            log(`  → ELECTRON_EXEC_PATH=${fullPath}`);
          }
        }
      }
    }

    await spawnAsync(`node "${electronViteBin}" dev`, [], {
      cwd: projectRoot,
      env: { ...process.env, UPDATE_CHANNEL: flags.channel },
    });
    return;
  }

  // ── 多平台调度 ──
  if (isMultiPlatform || flags.platform === 'all') {
    await buildForPlatforms(flags);
    return;
  }

  // ── 单平台构建 + 打包模式 ──
  const platform = PLATFORMS[flags.platform];
  const needEnvCheck = !flags.skipPrepare;
  const needBuild = (flags.mode === BUILD_MODES.BUILD || flags.mode === BUILD_MODES.PACKAGE) && !flags.skipPrepare;
  const needPackage = flags.mode === BUILD_MODES.PACKAGE;
  const needVerify = needPackage && !flags.skipVerify;

  const totalSteps = (needEnvCheck ? 1 : 0) + 1 + (needBuild ? 1 : 0) + (needPackage ? 1 : 0) + (needPackage ? 1 : 0) + (needVerify ? 1 : 0);
  let currentStep = 0;

  // Step: 环境检查
  if (needEnvCheck) {
    step(++currentStep, totalSteps, '环境检查');
    await envCheck(flags);
    await ensureElectronBinary(flags);
  }

  // Step: 准备 pnpm 别名模块
  if (needPackage) {
    step(++currentStep, totalSteps, '准备 pnpm 别名模块（INC-011）');
    await preparePnpmAliases(flags);
  }

  // Step: electron-vite build
  if (needBuild) {
    step(++currentStep, totalSteps, 'electron-vite build');
    buildElectronVite(flags);
  } else if (needPackage && !dirExists(distDir)) {
    throw new Error('dist/ 不存在，请先运行 --build 或去掉 --skip-prepare');
  }

  // Step: electron-builder
  let builderOutput, finalOutput;
  if (needPackage) {
    step(++currentStep, totalSteps, 'electron-builder 打包');
    const result = runElectronBuilder(flags);
    builderOutput = result.builderOutput;
    finalOutput = result.finalOutput;
  }

  // Step: 搬迁产物
  if (needPackage && builderOutput && builderOutput !== finalOutput) {
    step(++currentStep, totalSteps, '搬迁产物（INC-012 文件锁）');
    await commitOutput(builderOutput, finalOutput, flags);
  }

  // Step: 验证产物
  if (needVerify) {
    step(++currentStep, totalSteps, '验证产物完整性');
    await verifyBuild(finalOutput || releaseDir, flags);
  }

  // 完成
  console.log(`\n${colors.bold}${colors.green}✅ 构建完成！${colors.reset}`);

  if (needPackage) {
    const out = finalOutput || releaseDir;
    console.log(`${colors.bold}产物目录:${colors.reset} ${path.relative(repoRoot, out)}`);
    if (flags.platform === 'win32') {
      const exe = path.join(out, platform.unpackedDirName, `UGSci${platform.exeExtension}`);
      if (fileExists(exe)) {
        console.log(`${colors.bold}主程序:${colors.reset}   ${path.relative(repoRoot, exe)}`);
      }
      console.log(`\n${colors.dim}提示: 首次运行可能被 SmartScreen 拦截，右键 → 属性 → 取消锁定即可${colors.reset}`);
    }
  }
  console.log('');
}

// ─────────────────────────────────────────────
// 入口
// ─────────────────────────────────────────────

main().catch((e) => {
  err('构建失败:', e.message);
  if (process.argv.includes('--verbose')) {
    console.error(e.stack);
  }
  process.exit(1);
});
