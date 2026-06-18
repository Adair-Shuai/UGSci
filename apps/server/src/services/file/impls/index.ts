import { type LobeChatDatabase } from '@lobechat/database';

import { fileEnv } from '@/envs/file';

import { LocalFileImpl } from './local';
import { S3StaticFileImpl } from './s3';
import { type FileServiceImpl } from './type';

/**
 * Create file service module
 * UGS-MODIFY: S3 未配置时 fallback 到本地文件存储，避免本地开发报错
 */
export const createFileServiceModule = (db: LobeChatDatabase): FileServiceImpl => {
  // S3 环境变量完整时使用 S3，否则 fallback 到本地文件存储
  const s3Configured =
    !!fileEnv.S3_ACCESS_KEY_ID &&
    !!fileEnv.S3_SECRET_ACCESS_KEY &&
    !!fileEnv.S3_ENDPOINT &&
    !!fileEnv.S3_BUCKET;

  if (s3Configured) {
    return new S3StaticFileImpl(db);
  }

  // 本地开发 fallback：使用文件系统存储
  return new LocalFileImpl(db);
};
