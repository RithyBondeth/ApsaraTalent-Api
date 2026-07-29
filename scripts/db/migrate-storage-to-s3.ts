/**
 * Copy every file from the local storage volume into the configured S3 bucket.
 *
 * Run this ONCE, while the app is still serving from the local driver, before
 * flipping STORAGE_DRIVER=s3. Because it only ever writes (never deletes), it
 * is safe to run repeatedly and safe to run against a live system: the volume
 * remains the source of truth until the driver is switched.
 *
 * Usage:
 *   # dry run — lists what would be uploaded
 *   STORAGE_DRIVER=s3 S3_BUCKET=... S3_REGION=... \
 *   S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
 *   npm run storage:migrate
 *
 *   # actually upload
 *   ... npm run storage:migrate -- --apply
 *
 * Options:
 *   --apply       perform the uploads (default is a dry run)
 *   --overwrite   re-upload objects that already exist in the bucket
 *   --root <dir>  source directory (default ./storage)
 */
import 'dotenv/config';
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, sep } from 'path';
import {
  isPublicStorageFolder,
  LocalStorageDriver,
  S3StorageDriver,
} from '../../libs/common/src/storage';

interface Args {
  apply: boolean;
  overwrite: boolean;
  root: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const rootIndex = argv.indexOf('--root');
  return {
    apply: argv.includes('--apply'),
    overwrite: argv.includes('--overwrite'),
    root:
      rootIndex >= 0 && argv[rootIndex + 1]
        ? argv[rootIndex + 1]
        : join(process.cwd(), 'storage'),
  };
}

/** Minimal content-type map. Wrong types break inline rendering in browsers. */
const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
};

function contentTypeFor(path: string): string | undefined {
  const dot = path.lastIndexOf('.');
  if (dot < 0) return undefined;
  return CONTENT_TYPES[path.slice(dot).toLowerCase()];
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function buildS3Driver(): S3StorageDriver {
  const {
    S3_BUCKET,
    S3_REGION,
    S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY,
    S3_ENDPOINT,
    S3_FORCE_PATH_STYLE,
    S3_PUBLIC_BASE_URL,
  } = process.env;

  if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error(
      'S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must all be set.',
    );
  }

  return new S3StorageDriver({
    bucket: S3_BUCKET,
    region: S3_REGION,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    endpoint: S3_ENDPOINT || undefined,
    forcePathStyle: S3_FORCE_PATH_STYLE === 'true',
    publicBaseUrl: S3_PUBLIC_BASE_URL || undefined,
    signedUrlExpirySeconds: 900,
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

async function main() {
  const args = parseArgs();
  const s3 = buildS3Driver();
  // Only used to validate that keys resolve inside the storage root.
  new LocalStorageDriver(args.root);

  console.log(`\nSource: ${args.root}`);
  console.log(`Bucket: ${process.env.S3_BUCKET}`);
  console.log(
    args.apply
      ? `Mode:   APPLY${args.overwrite ? ' (overwriting existing)' : ''}\n`
      : 'Mode:   DRY RUN (pass --apply to upload)\n',
  );

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;

  for await (const absolutePath of walk(args.root)) {
    // Object keys always use forward slashes, whatever the host OS does.
    const key = relative(args.root, absolutePath).split(sep).join('/');

    // Ignore stray dotfiles (.DS_Store, .gitkeep) — they are not user content.
    if (key.split('/').some((segment) => segment.startsWith('.'))) {
      continue;
    }

    try {
      if (!args.overwrite && (await s3.exists(key))) {
        skipped++;
        continue;
      }

      const info = await stat(absolutePath);

      if (!args.apply) {
        console.log(`  would upload  ${key}  (${formatBytes(info.size)})`);
        uploaded++;
        bytes += info.size;
        continue;
      }

      const body = await readFile(absolutePath);
      await s3.put(key, body, {
        contentType: contentTypeFor(key),
        // Public/private is decided by the top-level folder, matching how the
        // application classifies them at runtime. Getting this wrong would
        // either break avatars or expose resumes, so it is derived rather than
        // assumed.
        publicRead: isPublicStorageFolder(key.split('/')[0] ?? ''),
      });

      uploaded++;
      bytes += info.size;
      if (uploaded % 50 === 0) {
        console.log(`  ...${uploaded} uploaded`);
      }
    } catch (error: any) {
      failed++;
      console.error(`  FAILED  ${key}: ${error?.message ?? error}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(
    `${args.apply ? 'Uploaded' : 'Would upload'}: ${uploaded} file(s), ${formatBytes(bytes)}`,
  );
  console.log(`Already present:  ${skipped}`);
  console.log(`Failed:           ${failed}`);

  if (failed > 0) {
    console.error(
      '\nSome files failed. Re-run to retry (existing objects are skipped).',
    );
    process.exit(1);
  }

  if (!args.apply) {
    console.log('\nDry run — nothing uploaded. Re-run with --apply.');
  } else {
    console.log(
      '\nDone. Verify a few files, then set STORAGE_DRIVER=s3 and redeploy.',
    );
    console.log(
      'Keep the volume until you have confirmed the app serves from S3.',
    );
  }
}

main().catch((error) => {
  console.error('\nStorage migration failed:', error);
  process.exit(1);
});
