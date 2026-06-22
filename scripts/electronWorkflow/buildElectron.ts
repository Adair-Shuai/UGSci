import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

/**
 * Build desktop application based on current operating system platform.
 *
 * 委托给 apps/desktop/scripts/build.mjs（统一构建脚本），
 * 该脚本内部已处理所有平台差异。
 */
const buildElectron = () => {
  const platform = os.platform();
  const startTime = Date.now();

  console.log(`🔨 Starting to build desktop app for ${platform} platform...`);

  const rootDir = path.resolve(__dirname, '../..');
  const buildScript = path.join(rootDir, 'apps', 'desktop', 'scripts', 'build.mjs');

  try {
    // 使用统一构建脚本的 --package 模式
    execSync(`node "${buildScript}" --package`, {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        // 确保平台环境变量传递
        npm_config_platform: platform,
      },
    });

    const endTime = Date.now();
    const buildTime = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`✅ Desktop application build completed! (${buildTime}s)`);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
};

// Execute build
buildElectron();
