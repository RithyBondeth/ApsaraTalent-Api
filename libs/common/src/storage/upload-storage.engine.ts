import { Request } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage, StorageEngine } from 'multer';
import { join } from 'path';
import { StorageServiceEngine } from './multer-storage.engine';
import { StorageRegistry } from './storage.registry';

export interface UploadStorageOptions {
  /** Folder under the storage root, e.g. "employee-avatars" or "chat/2026-07-18". */
  resolveFolder: (req: Request, file: Express.Multer.File) => string;
  resolveFilename: (req: Request, file: Express.Multer.File) => string;
}

/**
 * A multer engine that decides between the local disk and the storage service
 * **per request**, rather than when the engine is constructed.
 *
 * That matters because some multer options are module-level constants
 * (chat-upload.config.ts) evaluated at import time — before StorageModule has
 * initialised. Choosing eagerly there would always pick the disk engine and
 * quietly ignore STORAGE_DRIVER=s3, sending uploads to an ephemeral container
 * disk. Deciding at request time removes that ordering dependency entirely.
 */
export function createUploadStorageEngine(
  options: UploadStorageOptions,
): StorageEngine {
  const { resolveFolder, resolveFilename } = options;

  const s3Engine = new StorageServiceEngine(resolveFolder, resolveFilename);

  const diskEngine = diskStorage({
    destination: (req, file, callback) => {
      const dir = join(process.cwd(), 'storage', resolveFolder(req, file));
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      callback(null, dir);
    },
    filename: (req, file, callback) => {
      callback(null, resolveFilename(req, file));
    },
  });

  const pick = (): StorageEngine =>
    StorageRegistry.isReady() && StorageRegistry.get().driverName === 's3'
      ? s3Engine
      : diskEngine;

  return {
    _handleFile(req, file, callback) {
      pick()._handleFile(req, file, callback);
    },
    _removeFile(req, file, callback) {
      pick()._removeFile(req, file, callback);
    },
  };
}
