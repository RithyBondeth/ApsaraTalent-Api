import { Request } from 'express';
import { StorageEngine } from 'multer';
import { StorageRegistry } from './storage.registry';

export type PathResolver = (
  req: Request,
  file: Express.Multer.File,
) => string | Promise<string>;

/**
 * A multer StorageEngine that writes through StorageService instead of straight
 * to disk.
 *
 * Files are buffered in memory before being written. That is acceptable here
 * because every upload route already sets a multer `limits.fileSize` (10 MB for
 * chat, smaller for images), and multer aborts the stream the moment that limit
 * is exceeded — so the buffer is bounded by the limit, not by what a client
 * chooses to send.
 *
 * This engine is only used when the S3 driver is active. With the local driver
 * the original `diskStorage` engine is kept, so the default path is unchanged.
 */
export class StorageServiceEngine implements StorageEngine {
  constructor(
    private readonly resolveFolder: PathResolver,
    private readonly resolveFilename: PathResolver,
  ) {}

  _handleFile(
    req: Request,
    file: Express.Multer.File,
    callback: (error?: any, info?: Partial<Express.Multer.File>) => void,
  ): void {
    void (async () => {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of file.stream) {
          chunks.push(chunk as Buffer);
        }
        const buffer = Buffer.concat(chunks);

        const folder = await this.resolveFolder(req, file);
        const filename = await this.resolveFilename(req, file);
        const key = `${folder}/${filename}`.replace(/\/+/g, '/');

        const storage = StorageRegistry.get();
        const storedPath = await storage.put(key, buffer, {
          contentType: file.mimetype,
        });

        // Downstream code reads `filename` to build the DB path and `path` for
        // logging/cleanup, so both are populated to match the disk engine's
        // contract. `size` keeps validation that inspects it working.
        callback(null, {
          filename,
          path: storedPath,
          size: buffer.length,
        });
      } catch (error) {
        callback(error);
      }
    })();
  }

  _removeFile(
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null) => void,
  ): void {
    void (async () => {
      try {
        const storage = StorageRegistry.get();
        const key = storage.toKey(file.path);
        if (key) await storage.delete(key);
        callback(null);
      } catch (error) {
        callback(error as Error);
      }
    })();
  }
}
