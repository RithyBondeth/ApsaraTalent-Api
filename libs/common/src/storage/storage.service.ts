import { Inject, Injectable } from '@nestjs/common';
import {
  GetUrlOptions,
  PutOptions,
  STORAGE_DRIVER,
  StorageDriver,
  StorageKey,
  StorageObject,
} from './storage-driver.interface';
import {
  STORAGE_PATH_PREFIX,
  isPublicStorageFolder,
} from './storage.constants';

/**
 * The single entry point the application uses to read and write user files.
 *
 * Its main job beyond delegating to a driver is owning the translation between
 * the two representations of a file:
 *
 *   stored path (in the database)  ->  "/storage/employee-avatars/pic-1.png"
 *   storage key (in the driver)    ->  "employee-avatars/pic-1.png"
 *
 * Keeping that mapping in one place is what allows the storage backend to
 * change without rewriting a single database row.
 */
@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_DRIVER) private readonly driver: StorageDriver) {}

  get driverName(): 'local' | 's3' {
    return this.driver.name;
  }

  /** "employee-avatars/pic.png" -> "/storage/employee-avatars/pic.png" */
  toStoredPath(key: StorageKey): string {
    return `${STORAGE_PATH_PREFIX}/${key.replace(/^\/+/, '')}`;
  }

  /**
   * "/storage/employee-avatars/pic.png" -> "employee-avatars/pic.png"
   *
   * Returns null for anything that is not a storage path (an absolute external
   * URL, a data URI, an empty column), so callers can pass raw database values
   * in without pre-checking.
   */
  toKey(storedPath?: string | null): StorageKey | null {
    if (!storedPath) return null;
    const trimmed = storedPath.trim();
    if (!trimmed.startsWith(`${STORAGE_PATH_PREFIX}/`)) return null;
    const key = trimmed.slice(STORAGE_PATH_PREFIX.length + 1);
    return key.length > 0 ? key : null;
  }

  /** The top-level folder of a key, e.g. "chat" for "chat/2026-07-18/a.webm". */
  folderOf(key: StorageKey): string {
    return key.split('/')[0] ?? '';
  }

  isPublic(key: StorageKey): boolean {
    return isPublicStorageFolder(this.folderOf(key));
  }

  async put(
    key: StorageKey,
    body: Buffer,
    options?: PutOptions,
  ): Promise<string> {
    await this.driver.put(key, body, {
      ...options,
      // Public/private is a property of the folder, not of the call site, so it
      // is derived here rather than trusted from each caller.
      publicRead: options?.publicRead ?? this.isPublic(key),
    });
    return this.toStoredPath(key);
  }

  get(key: StorageKey): Promise<StorageObject> {
    return this.driver.get(key);
  }

  exists(key: StorageKey): Promise<boolean> {
    return this.driver.exists(key);
  }

  delete(key: StorageKey): Promise<void> {
    return this.driver.delete(key);
  }

  /**
   * A directly-fetchable URL, or null when the caller must stream the bytes.
   *
   * Callers are responsible for authorizing the request BEFORE calling this for
   * a private object: a presigned URL grants access to anyone holding it for as
   * long as it is valid.
   */
  getUrl(
    key: StorageKey,
    options?: Omit<GetUrlOptions, 'publicRead'>,
  ): Promise<string | null> {
    return this.driver.getUrl(key, {
      ...options,
      publicRead: this.isPublic(key),
    });
  }
}
