/**
 * Folders whose contents are world-readable: profile imagery and template
 * previews. These were previously served by `app.useStaticAssets` with no auth
 * check, so treating them as public preserves the existing behaviour exactly.
 */
export const PUBLIC_STORAGE_FOLDERS = [
  'employee-avatars',
  'company-avatars',
  'company-covers',
  'company-images',
  'resume-templates',
] as const;

/**
 * Folders holding user documents. These are only ever reachable through an
 * authenticated controller that performs an ownership/participation check
 * first — never via a static route.
 */
export const PRIVATE_STORAGE_FOLDERS = [
  'resumes',
  'cover-letters',
  'chat',
] as const;

export type PublicStorageFolder = (typeof PUBLIC_STORAGE_FOLDERS)[number];

/** Prefix under which every stored path is persisted in the database. */
export const STORAGE_PATH_PREFIX = '/storage';

export const isPublicStorageFolder = (folder: string): boolean =>
  (PUBLIC_STORAGE_FOLDERS as readonly string[]).includes(folder);
