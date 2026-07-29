import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { StorageService } from './storage.service';

export interface ServeOptions {
  /** Value for the Content-Disposition header, e.g. `inline; filename*=...`. */
  disposition?: string;
  /** Defaults to no-store for private objects; pass a CDN policy for public. */
  cacheControl?: string;
  expiresInSeconds?: number;
  /**
   * Whether the response may be a 302 to the object store.
   *
   * Defaults to public-only, and that default is deliberate. Private documents
   * are fetched by the web client with `fetch(url, {credentials:'include'})`
   * and read as a blob; a cross-origin redirect would then require the bucket
   * to return `Access-Control-Allow-Credentials: true` with an explicit origin
   * (credentialed CORS forbids `*`). That is fragile configuration living
   * outside this repository, and getting it wrong breaks resume previews — so
   * private bytes are streamed through the API instead, preserving the exact
   * 200 + headers contract the client already depends on.
   *
   * Public images have no such constraint: they load via <img>, so redirecting
   * them keeps bandwidth (and cache-ability) off the API entirely.
   */
  allowRedirect?: boolean;
}

/**
 * Serve a stored object to the browser, using whichever mechanism the active
 * driver supports:
 *
 *   - object store -> 302 to a URL (public CDN URL, or a short-lived presigned
 *     URL for private objects), so bytes never transit the API
 *   - local disk   -> stream the file through this process, as before
 *
 * IMPORTANT: this performs NO authorization. Private objects must already have
 * been authorized by the caller, because a presigned URL grants access to
 * whoever holds it until it expires.
 */
export async function serveStorageObject(
  res: Response,
  storage: StorageService,
  key: string,
  options: ServeOptions = {},
): Promise<void> {
  const cacheControl =
    options.cacheControl ??
    (storage.isPublic(key) ? 'public, max-age=3600' : 'private, no-store');

  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  const mayRedirect = options.allowRedirect ?? storage.isPublic(key);

  if (mayRedirect) {
    const url = await storage.getUrl(key, {
      expiresInSeconds: options.expiresInSeconds,
      responseContentDisposition: options.disposition,
    });

    if (url) {
      // 302 rather than 301: presigned URLs expire, so this must never be
      // cached as a permanent redirect by a browser or intermediary.
      res.redirect(302, url);
      return;
    }
  }

  // Local driver, redirects disallowed, or presigning failed — stream it.
  if (!(await storage.exists(key))) {
    throw new NotFoundException('File not found');
  }

  const object = await storage.get(key);
  if (object.contentType) res.setHeader('Content-Type', object.contentType);
  if (object.contentLength !== undefined) {
    res.setHeader('Content-Length', String(object.contentLength));
  }
  if (options.disposition) {
    res.setHeader('Content-Disposition', options.disposition);
  }

  object.stream.pipe(res);
}
