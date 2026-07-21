import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { StorageEngine } from 'multer';
import * as path from 'path';
import { createUploadStorageEngine } from '../storage/upload-storage.engine';
import { StorageRegistry } from '../storage/storage.registry';

@Injectable()
export class UploadfileService {
  private static readonly logger = new Logger(UploadfileService.name);

  constructor() {}

  private static buildFilename(originalname: string): string {
    const name = originalname.split('.')[0];
    const fileExtName = path.extname(originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    return `${name}-${uniqueSuffix}${fileExtName}`;
  }

  /**
   * Picks the local disk or the configured object store per request — see
   * createUploadStorageEngine. The resulting filename and the `/storage/...`
   * path written to the database are identical either way.
   */
  static storageOptions = (folderName: string): StorageEngine =>
    createUploadStorageEngine({
      resolveFolder: () => folderName,
      resolveFilename: (_req, file) =>
        UploadfileService.buildFilename(file.originalname),
    });
  getUploadFile(folderName: string, file: Express.Multer.File): string {
    return `/storage/${folderName}/${file.filename}`;
  }

  /**
   * Accepts either an absolute filesystem path (how every existing call site
   * builds it, via `path.join(process.cwd(), 'storage/<folder>', name)`) or a
   * stored `/storage/...` path, and deletes from whichever backend is active.
   *
   * Deriving the object key here rather than at the call sites keeps all 17
   * callers unchanged. Without this branch, deletes would succeed locally and
   * silently no-op against S3, leaving removed resumes and avatars readable in
   * the bucket indefinitely.
   */
  static deleteFile(filePath: string, fileType: string) {
    if (StorageRegistry.isReady()) {
      const storage = StorageRegistry.get();
      if (storage.driverName === 's3') {
        const key = UploadfileService.toStorageKey(filePath);
        if (!key) {
          this.logger.warn(
            `${fileType} path is outside the storage root, skipping delete: ${filePath}`,
          );
          return;
        }
        void storage
          .delete(key)
          .then(() => this.logger.log(`${fileType} Deleted Successfully`))
          .catch((error) =>
            this.logger.error(
              `Failed to delete ${fileType}: ${error?.message ?? error}`,
            ),
          );
        return;
      }
    }

    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (error) => {
        if (error)
          this.logger.error(`Failed to delete ${fileType}: ${error.message}`);
        else this.logger.log(`${fileType} Deleted Successfully`);
      });
    } else {
      this.logger.warn(`${fileType} does not exist at path ${filePath}`);
    }
  }

  /**
   * "<cwd>/storage/resumes/cv.pdf" -> "resumes/cv.pdf"
   * "/storage/resumes/cv.pdf"      -> "resumes/cv.pdf"
   * Returns null when the path is not under the storage root.
   */
  private static toStorageKey(filePath: string): string | null {
    const normalized = filePath.split(path.sep).join('/');
    const root = path.join(process.cwd(), 'storage').split(path.sep).join('/');

    if (normalized.startsWith(`${root}/`)) {
      return normalized.slice(root.length + 1);
    }
    if (normalized.startsWith('/storage/')) {
      return normalized.slice('/storage/'.length);
    }
    return null;
  }
}
