#!/usr/bin/env node
/**
 * UGSci 桌面端 Windows 打包脚本（向后兼容包装）
 *
 * 此脚本为向后兼容保留，内部委托给 scripts/build.mjs（统一构建脚本）。
 * 如有新的构建需求，请直接使用 scripts/build.mjs。
 *
 * 用法（在 apps/desktop/ 目录下执行）：
 *   node scripts/build-desktop.mjs                     # 默认：完整打包 --dir
 *   node scripts/build-desktop.mjs --nsis              # 输出 Windows 安装程序
 *   node scripts/build-desktop.mjs --output my-build   # 自定义输出目录
 *   node scripts/build-desktop.mjs --skip-prepare      # 跳过环境准备
 *   node scripts/build-desktop.mjs --verify            # 仅验证已有产物
 *   node scripts/build-desktop.mjs --verbose           # 详细日志
 *
 * 跨平台用法：
 *   node scripts/build.mjs --package     # macOS/Linux 完整打包
 *   node scripts/build.mjs --help        # 查看所有选项
 */

import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildScript = path.join(__dirname, 'build.mjs');

// 将旧参数映射到 build.mjs 的参数
const args = process.argv.slice(2);
const mappedArgs = ['--package', `--platform=${os.platform()}`];

for (const arg of args) {
  if (arg === '--nsis') mappedArgs.push('--nsis');
  else if (arg === '--verify') {
    // 验证模式：替换为 --verify
    mappedArgs.length = 0;
    mappedArgs.push('--verify', `--platform=${os.platform()}`);
  } else if (arg === '--skip-prepare') mappedArgs.push('--skip-prepare');
  else if (arg === '--verbose') mappedArgs.push('--verbose');
  else if (arg.startsWith('--output')) mappedArgs.push(arg);
}

const command = `node "${buildScript}" ${mappedArgs.join(' ')}`;
console.log('\x1b[2m[向后兼容] 委托给 scripts/build.mjs\x1b[0m\n');

try {
  execSync(command, { stdio: 'inherit', cwd: __dirname });
} catch {
  process.exit(1);
}
