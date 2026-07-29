import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'fs';
import { access, mkdir, stat, unlink, writeFile } from 'fs/promises';
import { dirname, join, resolve, sep } from 'path';
import {
  StorageDriver,
  StorageKey,
  StorageObject,
} from './storage-driver.interface';

/**
 * Filesystem-backed driver. This is the historical behaviour: files live under
 * ./storage and are served from the same container that wrote them.
 *
 * It remains the default so that nothing changes until S3 is explicitly turned
 * on, and so a rollback is a single environment variable.
 */
@Injectable()
export class LocalStorageDriver implements StorageDriver {
  readonly name = 'local' as const;

  private readonly root: string;

  constructor(root?: string) {
    this.root = root ?? join(process.cwd(), 'storage');
  }

  /**
   * Resolve a key to an absolute path, refusing anything that escapes the
   * storage root. Keys reach this class from user-influenced values (filenames,
   * URL segments), so traversal has to be blocked here rather than assumed away
   * at the call sites.
   */
  private resolveKey(key: StorageKey): string {
    const target = resolve(this.root, key);
    if (target !== this.root && !target.startsWith(`${this.root}${sep}`)) {
      throw new NotFoundException('Invalid storage key');
    }
    return target;
  }

  // PutOptions is accepted for interface parity but unused: contentType is
  // inferred from the extension on read, and public/private is enforced by the
  // route that serves the file rather than by filesystem permissions.
  async put(key: StorageKey, body: Buffer): Promise<void> {
    const target = this.resolveKey(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
  }

  async get(key: StorageKey): Promise<StorageObject> {
    const target = this.resolveKey(key);
    try {
      await access(target);
    } catch {
      throw new NotFoundException('File not found');
    }
    const info = await stat(target);
    return {
      stream: createReadStream(target),
      contentLength: info.size,
    };
  }

  async exists(key: StorageKey): Promise<boolean> {
    try {
      await access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: StorageKey): Promise<void> {
    const target = this.resolveKey(key);
    try {
      await unlink(target);
    } catch (error: any) {
      // Deleting something that is already gone is the desired end state.
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  /**
   * The local driver cannot hand the browser a direct URL — the bytes have to
   * be streamed by the application. Returning null tells callers to do that.
   */
  async getUrl(): Promise<string | null> {
    return null;
  }
}
