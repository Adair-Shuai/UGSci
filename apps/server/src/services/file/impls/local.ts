// UGS-MODIFY: 本地文件存储实现（S3 未配置时的 fallback）
// 当 S3 环境变量未配置时，使用本地文件系统存储文件
// 适用于本地开发环境，避免 "S3 environment variables are not set" 错误
import { type LobeChatDatabase } from '@lobechat/database';
import debug from 'debug';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import type { FileServiceImpl, PreSignedUpload } from './type';

const log = debug('lobe-file:local');

/** 本地存储根目录（项目 .local-storage/files） */
const LOCAL_STORAGE_ROOT = resolve(process.cwd(), '.local-storage', 'files');

/** 确保目录存在 */
const ensureDir = async (filePath: string) => {
  await mkdir(dirname(filePath), { recursive: true });
};

/**
 * Local filesystem-based file service implementation
 * Used as fallback when S3 is not configured (local development)
 */
export class LocalFileImpl implements FileServiceImpl {
  private readonly db: LobeChatDatabase;

  constructor(db: LobeChatDatabase) {
    this.db = db;
    log('LocalFileImpl initialized, storage root: %s', LOCAL_STORAGE_ROOT);
  }

  private resolvePath(key: string): string {
    // 防止路径穿越
    const safeKey = key.replace(/\.\./g, '').replace(/^\//, '');
    return join(LOCAL_STORAGE_ROOT, safeKey);
  }

  async uploadContent(path: string, content: string): Promise<{ key: string }> {
    const filePath = this.resolvePath(path);
    await ensureDir(filePath);
    await writeFile(filePath, content, 'utf-8');
    log('uploadContent: %s', path);
    return { key: path };
  }

  async uploadBuffer(
    key: string,
    buffer: Buffer,
    _contentType: string,
  ): Promise<{ key: string }> {
    const filePath = this.resolvePath(key);
    await ensureDir(filePath);
    await writeFile(filePath, buffer);
    log('uploadBuffer: %s (%d bytes)', key, buffer.length);
    return { key };
  }

  async uploadMedia(key: string, buffer: Buffer): Promise<{ key: string }> {
    return this.uploadBuffer(key, buffer, 'application/octet-stream');
  }

  async getFileContent(key: string): Promise<string> {
    const filePath = this.resolvePath(key);
    return readFile(filePath, 'utf-8');
  }

  async getFileByteArray(key: string): Promise<Uint8Array> {
    const filePath = this.resolvePath(key);
    const buf = await readFile(filePath);
    return new Uint8Array(buf);
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    await unlink(filePath).catch(() => void 0);
    log('deleteFile: %s', key);
  }

  async deleteFiles(keys: string[]): Promise<void> {
    await Promise.all(keys.map((k) => this.deleteFile(k)));
  }

  async getFileMetadata(
    key: string,
  ): Promise<{ contentLength: number; contentType?: string }> {
    const filePath = this.resolvePath(key);
    const stats = await stat(filePath);
    return { contentLength: stats.size };
  }

  // 以下方法在本地存储模式下返回本地 URL（不生成 pre-signed URL）
  async createPreSignedUrl(key: string): Promise<string> {
    return `/api/local-file/${encodeURIComponent(key)}`;
  }

  async createPreSignedUpload(key: string): Promise<PreSignedUpload> {
    return {
      url: `/api/local-file/upload/${encodeURIComponent(key)}`,
    };
  }

  async createPreSignedUrlForPreview(key: string, _expiresIn?: number): Promise<string> {
    return `/api/local-file/${encodeURIComponent(key)}`;
  }

  async createCachedPreSignedUrlForPreview(
    url?: string | null,
    _expiresIn?: number,
  ): Promise<string> {
    return url ?? '';
  }

  async getFullFileUrl(url?: string | null, _expiresIn?: number): Promise<string> {
    return url ?? '';
  }

  async getKeyFromFullUrl(url: string): Promise<string | null> {
    // 本地模式下 URL 格式为 /api/local-file/<key>
    const prefix = '/api/local-file/';
    if (url.startsWith(prefix)) return decodeURIComponent(url.slice(prefix.length));
    return null;
  }
}
