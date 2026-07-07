// UGS-MODIFY: UGS-016 预置 MCP 环境变量配置
//
// 通过服务端环境变量控制预置 MCP 的命令路径，编译部署后管理员可在 .env 中随时修改并重启服务生效。
// 未配置的环境变量 → 对应 MCP 不自动安装（跳过），不影响其他功能。
import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const getUgsConfig = () => {
  return createEnv({
    runtimeEnv: {
      UGS_NEQSIM_JAVA_BIN: process.env.UGS_NEQSIM_JAVA_BIN,
      UGS_NEQSIM_JAR_PATH: process.env.UGS_NEQSIM_JAR_PATH,
      UGS_PYRESTOOLBOX_BIN: process.env.UGS_PYRESTOOLBOX_BIN,
      UGS_PYRESTOOLBOX_SERVER_PATH: process.env.UGS_PYRESTOOLBOX_SERVER_PATH,
    },
    server: {
      UGS_NEQSIM_JAVA_BIN: z.string().optional(),
      UGS_NEQSIM_JAR_PATH: z.string().optional(),
      UGS_PYRESTOOLBOX_BIN: z.string().optional(),
      UGS_PYRESTOOLBOX_SERVER_PATH: z.string().optional(),
    },
  });
};

export const ugsEnv = getUgsConfig();
