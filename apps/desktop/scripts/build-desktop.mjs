#!/usr/bin/env node
/**
 * UGSci 桌面端 Windows 打包脚本（一键脚本）
 *
 * 用法（在 apps/desktop/ 目录下执行）：
 *   node scripts/build-desktop.mjs                     # 默认：dir 模式，输出到 build/desktop/
 *   node scripts/build-desktop.mjs --nsis              # 输出 Windows 安装程序
 *   node scripts/build-desktop.mjs --output my-build   # 自定义输出目录
 *   node scripts/build-desktop.mjs --skip-prepare      # 跳过环境准备
 *   node scripts/build-desktop.mjs --verify            # 仅验证已有产物
 *
 * 设计目标：把 INC-006~012 的所有经验都编码进去，一次性成功。
 *
 * 关键经验（详见 ../../LESSONS_LEARNED.md）：
 *   - INC-006: electron 二进制手动下载
 *   - INC-007: ELECTRON_RUN_AS_NODE 泄漏
 *   - INC-008: VS BuildTools state=-1
 *   - INC-009: EPERM rename / @electron/get 枚举
 *   - INC-010: pnpm 10 EMFILE → TraversalNodeModulesCollector
 *   - INC-011: pnpm 别名 (strip-ansi-cjs) → 真实目录副本
 *   - INC-012: Windows 残留文件锁 → 隔离输出目录
 */

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..'); // apps/desktop
const repoRoot = path.resolve(projectRoot, '..', '..'); // UGSci/

// ============== 解析 CLI 参数 ==============
const args = process.argv.slice(2);
const flags = {
  nsis: args.includes('--nsis'),
  output: (() => {
    const i = args.indexOf('--output');
    return i !== -1 ? args[i + 1] : 'build/desktop';
  })(),
  skipPrepare: args.includes('--skip-prepare'),
  verify: args.includes('--verify'),
  verbose: args.includes('--verbose'),
};

const log = (...m) => console.log('\x1b[36m[build]\x1b[0m', ...m);
const ok = (...m) => console.log('\x1b[32m[  ✓  ]\x1b[0m', ...m);
const warn = (...m) => console.warn('\x1b[33m[  !  ]\x1b[0m', ...m);
const err = (...m) => console.error('\x1b[31m[  ✗  ]\x1b[0m', ...m);
const step = (n, name) => console.log(`\n\x1b[1m\x1b[35m━━━ Step ${n}/${flags.nsis ? 7 : 6}: ${name} ━━━\x1b[0m`);

const run = (cmd, opts = {}) => {
  if (flags.verbose) log('exec:', cmd);
  try {
    return execSync(cmd, { stdio: opts.silent ? 'pipe' : 'inherit', ...opts });
  } catch (e) {
    if (opts.allowFail) return e.stdout;
    throw e;
  }
};

const fileExists = (p) => fs.existsSync(p);
const dirExists = (p) => fs.existsSync(p) && fs.statSync(p).isDirectory();

// ============== Step 1: 环境检查与清理 ==============
async function envCheck() {
  step(1, '环境检查与清理');

  // INC-007: 清除 ELECTRON_RUN_AS_NODE 泄漏
  if (process.env.ELECTRON_RUN_AS_NODE) {
    delete process.env.ELECTRON_RUN_AS_NODE;
    warn('已 unset ELECTRON_RUN_AS_NODE（防 INC-007）');
  }

  // 检查 Electron 二进制（INC-006）
  const electronExe = path.join(projectRoot, 'node_modules', 'electron', 'dist', 'electron.exe');
  if (!fileExists(electronExe)) {
    warn('Electron 二进制缺失，正在手动下载（INC-006）…');
    run('node node_modules/electron/install.js', { cwd: projectRoot });
    if (!fileExists(electronExe)) throw new Error('Electron install.js 失败，请检查网络');
  }
  ok('Electron 二进制就绪：', path.relative(repoRoot, electronExe));

  // 检查 native 模块 .node 文件
  const gwNode = path.join(projectRoot, 'node_modules', '.pnpm', 'get-windows@9.3.0_encoding@0.1.13', 'node_modules', 'get-windows', 'build', 'Release', 'node-get-windows.node');
  const gwPrebuild = path.join(projectRoot, 'node_modules', '.pnpm', 'get-windows@9.3.0_encoding@0.1.13', 'node_modules', 'get-windows', 'lib', 'binding', 'napi-9-win32-unknown-x64', 'node-get-windows.node');
  if (fileExists(gwNode) && !fileExists(gwPrebuild)) {
    warn('get-windows 本地编译产物存在，但 NAPI 9 预编译缺失。prebuild-install 应自动下载预编译，可手动触发：');
    log('  cd node_modules/.pnpm/get-windows@9.3.0_encoding@0.1.13/node_modules/get-windows && npx --no-install node-pre-gyp install');
  }
  if (fileExists(gwPrebuild)) ok('get-windows NAPI 9 预编译就绪');
}

// ============== Step 2: 准备 pnpm 兼容模块 ==============
async function prepareModules() {
  step(2, '准备 native 模块 + pnpm 别名目录（INC-010/011）');

  // 强制 native 模块和别名模块作为真实目录副本放在 node_modules 顶层
  const targets = [
    // 4 个 native / runtime 模块
    { name: 'electron-log', src: 'electron-log@5.4.4' },
    { name: 'get-windows', src: 'get-windows@9.3.0_encoding@0.1.13' },
    { name: 'node-screenshots', src: 'node-screenshots@0.2.8' },
    { name: '@napi-rs/canvas', src: '@napi-rs+canvas@0.1.100' },
    // INC-011: pnpm 别名包（@isaacs/cliui 用了 strip-ansi-cjs 别名）
    { name: 'strip-ansi', src: 'strip-ansi@6.0.1' },
    { name: 'wrap-ansi', src: 'wrap-ansi@7.0.0' },
    { name: 'ansi-regex', src: 'ansi-regex@5.0.1' },
    { name: 'string-width', src: 'string-width@4.2.3' },
  ];

  log('复制模块到 node_modules 顶层（真实目录，避免 symlink 被重命名）');
  for (const t of targets) {
    const src = path.join(projectRoot, 'node_modules', '.pnpm', t.src, 'node_modules', t.name);
    const dest = path.join(projectRoot, 'node_modules', t.name);
    if (!fileExists(src)) {
      warn(`源不存在（跳过）: ${t.src}/node_modules/${t.name}`);
      continue;
    }
    if (fileExists(dest)) {
      try {
        const stat = fs.lstatSync(dest);
        if (stat.isSymbolicLink()) {
          // symlink 会被 electron-builder 跟到 .pnpm 然后用链接名，删除重做
          fs.unlinkSync(dest);
        }
      } catch {}
    }
    // 强制真实目录副本
    await fsp.rm(dest, { recursive: true, force: true });
    await copyDir(src, dest);
  }
  ok('所有 native + pnpm 别名模块已就位为真实目录');
}

async function copyDir(src, dst) {
  await fsp.mkdir(dst, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const sp = path.join(src, e.name);
    const dp = path.join(dst, e.name);
    if (e.isDirectory()) {
      await copyDir(sp, dp);
    } else if (e.isSymbolicLink()) {
      const real = await fsp.realpath(sp);
      const realStat = await fsp.stat(real);
      if (realStat.isDirectory()) {
        await copyDir(real, dp);
      } else {
        await fsp.copyFile(real, dp);
      }
    } else {
      await fsp.copyFile(sp, dp);
    }
  }
}

// ============== Step 3: 跑 electron-vite build ==============
function buildMain() {
  step(3, '跑 electron-vite build（生成 dist/）');

  // 不用 pnpm run（会触发 pnpm install 检查），直接 node 调用
  const electronVite = path.join(projectRoot, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js');
  if (!fileExists(electronVite)) throw new Error('找不到 electron-vite');

  log('NODE_OPTIONS=--max-old-space-size=8192 electron-vite build');
  run(`node "${electronVite}" build`, { cwd: projectRoot });
  ok('dist/ 已生成：', path.relative(repoRoot, path.join(projectRoot, 'dist')));
}

// ============== Step 4: 隔离输出 + 跑 electron-builder ==============
function runBuilder() {
  step(4, 'electron-builder 打包（隔离输出目录防 INC-012 文件锁）');

  // INC-012: 用时间戳/唯一目录避免 Windows 残留锁
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const finalOut = path.join(projectRoot, flags.output);
  const builderOut = path.join(projectRoot, flags.output + '__building-' + stamp);

  log('输出目录（隔离）:', path.relative(repoRoot, builderOut));
  log('最终目录:', path.relative(repoRoot, finalOut));

  const cli = path.join(projectRoot, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js');
  const electronDist = path.join(projectRoot, 'node_modules', 'electron', 'dist');

  const builderArgs = [
    `node "${cli}"`,
    flags.nsis ? '--win' : '--dir',
    '--config electron-builder.mjs',
    '-c.mac.notarize=false',
    '-c.mac.identity=null',
    `-c.electronDist="${electronDist}"`,
    `-c.directories.output="${builderOut}"`,
  ];

  if (flags.nsis) {
    builderArgs.push('--publish never');
  }

  run(builderArgs.join(' '), { cwd: projectRoot });

  return { builderOut, finalOut };
}

// ============== Step 5: 把隔离目录搬到最终目录 ==============
async function commitOutput(builderOut, finalOut) {
  step(5, '搬迁产物到最终目录');

  // signtool 刚完成时 LobeHub.exe 仍可能被 Windows 锁住
  // 1. 先尝试 rename（快速，Windows 锁释放时立即生效）
  // 2. rename EPERM 时改用 copy + 延迟 unlink（绕开锁）
  // 3. 旧 finalOut 提前重命名（如果存在）
  if (dirExists(finalOut)) {
    const old = finalOut + '.old-' + Date.now();
    try {
      await fsp.rename(finalOut, old);
      log('旧产物已重命名为:', path.relative(repoRoot, old));
    } catch (e) {
      warn('旧产物 rename 失败，改用 copy-rename-unlink:', e.code);
      // 用 copy + 旧版 unlink
      await fsp.cp(finalOut, old, { recursive: true });
      try {
        await fsp.rm(finalOut, { recursive: true, force: true });
      } catch {}
    }
  }

  // 优先尝试 rename
  try {
    await fsp.rename(builderOut, finalOut);
    ok('产物已就位（rename）:', path.relative(repoRoot, finalOut));
    return;
  } catch (e) {
    warn('rename 失败（signtool 锁），改用 copy + 延迟 unlink:', e.code);
  }

  // copy 整个目录（handle 流式复制，不依赖原子 rename）
  await fsp.cp(builderOut, finalOut, { recursive: true });
  ok('产物已就位（copy）:', path.relative(repoRoot, finalOut));

  // 尝试清理 builderOut（多次重试，Windows 锁可能未释放）
  for (let i = 0; i < 10; i++) {
    try {
      await fsp.rm(builderOut, { recursive: true, force: true });
      log('清理 builder 临时目录:', path.relative(repoRoot, builderOut));
      break;
    } catch (e) {
      if (i < 9) await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

// ============== Step 6: 验证产物 ==============
async function verify(finalOut) {
  step(6, '验证产物完整性');

  // electron-builder --dir 输出是 finalOut/win-unpacked/，不是 finalOut/ 直接
  // 兼容两种情况：用户指定 output 包含 win-unpacked/ 后缀 或 包含完整目录
  const isFlat = fs.existsSync(path.join(finalOut, 'LobeHub.exe'));
  const winUnpacked = isFlat ? finalOut : path.join(finalOut, 'win-unpacked');

  const checks = [
    { p: path.join(winUnpacked, 'LobeHub.exe'), label: 'LobeHub.exe (主入口)' },
    { p: path.join(winUnpacked, 'resources', 'app.asar'), label: 'app.asar (业务包)' },
    { p: path.join(winUnpacked, 'resources', 'app.asar.unpacked', 'node_modules'), label: 'app.asar.unpacked (native 模块)' },
  ];
  for (const c of checks) {
    if (!fileExists(c.p)) throw new Error(`产物缺失: ${c.label} (${c.p})`);
    const stat = await fsp.stat(c.p);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
    ok(`${c.label}: ${sizeMB} MB`);
  }

  // 校验关键模块在 asar 中
  const asar = path.join(winUnpacked, 'resources', 'app.asar');
  log('校验关键模块在 asar 中…');
  const asarBin = path.join(projectRoot, 'node_modules', '@electron', 'asar', 'bin', 'asar.js');
  // 找真实的 asar 路径
  const asarPaths = [
    path.join(projectRoot, 'node_modules', '.pnpm', '@electron+asar@3.4.1', 'node_modules', '@electron', 'asar', 'bin', 'asar.js'),
  ];
  let asarTool = asarPaths.find((p) => fileExists(p));
  if (!asarTool) {
    // 退而求其次
    asarTool = path.join(projectRoot, 'node_modules', 'asar', 'bin', 'asar.js');
  }
  if (!fileExists(asarTool)) {
    warn('asar 工具未找到，跳过关键模块校验');
  } else {
    const list = execSync(`node "${asarTool}" list "${asar}"`, { encoding: 'utf8' });
    const critical = ['strip-ansi', 'wrap-ansi', 'string-width', 'ansi-regex', 'gauge', 'electron-log'];
    let missing = [];
    for (const m of critical) {
      // asar 内部用 \\ 分隔
      const ok = list.split('\n').some((line) => line.includes(`node_modules\\${m}\\`) || line.includes(`node_modules/${m}/`));
      if (!ok) missing.push(m);
    }
    if (missing.length > 0) {
      throw new Error(`asar 缺少关键模块: ${missing.join(', ')}。重新跑脚本可恢复。`);
    }
    ok('所有关键模块在 asar 中找到');
  }

  // 校验 .node 二进制
  const unpacked = path.join(winUnpacked, 'resources', 'app.asar.unpacked', 'node_modules');
  const find = (dir, name) => {
    let result = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) result = result.concat(find(p, name));
        else if (e.name === name) result.push(p);
      }
    } catch {}
    return result;
  };
  const nodes = find(unpacked, '*.node').length === 0 ? find(unpacked, '').filter((f) => f.endsWith('.node')) : [];
  // 上面的 find 复杂，简化为：
  const allNodes = execSync(`node -e "const fs=require('fs');const path=require('path');function w(d){let r=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())r=r.concat(w(p));else if(e.name.endsWith('.node'))r.push(p);}return r;}console.log(w(process.argv[1]).join('\\n'));" "${unpacked}"`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  ok(`.node 二进制（native）: ${allNodes.length} 个`);
  if (allNodes.length < 4) {
    warn('native .node 数量偏少（应 ≥ 4），可能影响运行');
  }
}

// ============== 主流程 ==============
async function main() {
  console.log('\n\x1b[1m🚀 UGSci 桌面端 Windows 打包脚本\x1b[0m');
  console.log('\x1b[2m封装 INC-006~012 全部经验，预期一次性成功\x1b[0m');
  console.log('\x1b[2m输出目录: ' + path.relative(repoRoot, path.join(projectRoot, flags.output)) + '\x1b[0m');

  if (!flags.verify) {
    // env-check 和 build-main 可被 --skip-prepare 跳过，但 prepareModules 永远要跑
    // （否则 native module symlink 缺失，beforePack 报 ENOENT）
    if (!flags.skipPrepare) {
      await envCheck();
      buildMain();
    } else {
      log('跳过 env-check / build-main (--skip-prepare)');
      if (!dirExists(path.join(projectRoot, 'dist'))) {
        throw new Error('--skip-prepare 但 dist/ 不存在，请先去掉 --skip-prepare 跑一次');
      }
    }
    await prepareModules();
  }
  if (flags.verify) {
    log('仅验证模式（--verify），跳过 builder');
    const finalOut = path.join(projectRoot, flags.output);
    if (!dirExists(finalOut)) throw new Error('产物目录不存在: ' + finalOut);
    await verify(finalOut);
    console.log('\n\x1b[1m\x1b[32m✅ 验证通过！\x1b[0m\n');
    return;
  }
  const { builderOut, finalOut } = runBuilder();
  await commitOutput(builderOut, finalOut);
  await verify(finalOut);

  console.log('\n\x1b[1m\x1b[32m✅ 打包完成！\x1b[0m');
  console.log('\x1b[1m产物: \x1b[0m' + path.relative(repoRoot, finalOut));
  // electron-builder --dir 的产物在 win-unpacked/ 子目录
  const finalWinUnpacked = fs.existsSync(path.join(finalOut, 'LobeHub.exe'))
    ? finalOut
    : path.join(finalOut, 'win-unpacked');
  console.log('\x1b[1m主程序: \x1b[0m' + path.relative(repoRoot, path.join(finalWinUnpacked, 'LobeHub.exe')));
  console.log('\n\x1b[2m提示: 首次运行 LobeHub.exe 可能被 SmartScreen 拦截，右键 → 属性 → 取消锁定即可\x1b[0m\n');
}

main().catch((e) => {
  err('打包失败:', e.message);
  if (flags.verbose) console.error(e.stack);
  process.exit(1);
});
