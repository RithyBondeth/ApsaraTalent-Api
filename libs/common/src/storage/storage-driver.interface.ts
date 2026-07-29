import { Readable } from 'stream';

/**
 * An object key, always relative to the storage root and using forward slashes:
 *   "employee-avatars/photo-123.png"
 *   "chat/2026-07-18/a1b2c3.webm"
 *
 * This is deliberately the same shape as the on-disk layout under ./storage, so
 * the value persisted in the database (`/storage/<key>`) is identical whichever
 * driver is active. That is what makes switching drivers a config change rather
 * than a data migration.
 */
export type StorageKey = string;

export interface StorageObject {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
}

export interface PutOptions {
  contentType?: string;
  /**
   * Hint that the object is world-readable (avatars, company images, resume
   * template previews). Private objects (resumes, cover letters, chat
   * attachments) are only ever reachable through an authenticated endpoint.
   */
  publicRead?: boolean;
}

export interface StorageDriver {
  readonly name: 'local' | 's3';

  put(key: StorageKey, body: Buffer, options?: PutOptions): Promise<void>;

  get(key: StorageKey): Promise<StorageObject>;

  exists(key: StorageKey): Promise<boolean>;

  delete(key: StorageKey): Promise<void>;

  /**
   * A URL the browser can fetch directly, or `null` if the driver cannot
   * produce one and the caller should stream the bytes itself.
   *
   * For public objects this is a stable CDN/bucket URL. For private objects the
   * S3 driver returns a short-lived presigned URL — callers MUST still perform
   * their own authorization check before handing one out, because a presigned
   * URL bypasses the application entirely once issued.
   */
  getUrl(key: StorageKey, options?: GetUrlOptions): Promise<string | null>;
}

export interface GetUrlOptions {
  expiresInSeconds?: number;
  publicRead?: boolean;
  /**
   * Content-Disposition to bake into a presigned URL. Without this the object
   * store serves its own headers and the browser names the download after the
   * storage key (a uuid) rather than the original filename.
   */
  responseContentDisposition?: string;
}

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');
