import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  isPublicStorageFolder,
  serveStorageObject,
  StorageService,
} from '@app/common';

/**
 * Serves world-readable files (avatars, company imagery, resume-template
 * previews) at the same `/storage/<folder>/<path>` URLs they have always used.
 *
 * With the local driver these requests are normally answered by the
 * `useStaticAssets` middleware in main.ts, which runs first; this controller
 * only sees what that misses. With the S3 driver the static directories are
 * empty, so every request falls through to here and is redirected to the
 * bucket or CDN.
 *
 * Keeping the URL shape identical is what lets the storage backend change
 * without rewriting database rows or touching the frontend.
 */
@Controller('storage')
export class PublicStorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get(':folder/*path')
  async getPublicFile(
    @Param('folder') folder: string,
    @Param('path') path: string | string[],
    @Res() res: Response,
  ): Promise<void> {
    // Only the public folders are reachable here. Resumes, cover letters and
    // chat attachments must go through their authenticated endpoints, so an
    // unknown or private folder is a 404 rather than a redirect.
    if (!isPublicStorageFolder(folder)) {
      throw new NotFoundException('File not found');
    }

    const segments = Array.isArray(path) ? path : [path];

    // Reject traversal and empty segments before they reach a driver. The local
    // driver blocks escapes too, but an object key with ".." in it is never
    // legitimate and should not reach S3 either.
    if (
      segments.some((s) => !s || s === '.' || s === '..' || s.includes('\\'))
    ) {
      throw new NotFoundException('File not found');
    }

    const key = [folder, ...segments].join('/');
    await serveStorageObject(res, this.storageService, key, {
      cacheControl: 'public, max-age=3600',
    });
  }
}
