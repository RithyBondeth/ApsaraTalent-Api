/**
 * Prove the storage volume was copied into the bucket correctly, and that the
 * bucket's public/private boundary is where it should be.
 *
 * This is the gate before `STORAGE_DRIVER=s3`, and again before the volume is
 * ever detached. `storage:migrate` reports what it *believes* it uploaded;
 * this checks the bucket itself and is the only thing that should be trusted.
 *
 * Read-only. It never writes, deletes, or modifies anything.
 *
 * Usage:
 *   STORAGE_DRIVER=s3 S3_BUCKET=... S3_REGION=... \
 *   S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
 *   npm run storage:verify
 *
 * Options:
 *   --root <dir>   source directory (default ./storage)
 *   --quick        compare sizes only; skip content hashing
 *   --sample <n>   objects per class in the public/private audit (default 5)
 *   --no-audit     skip the anonymous access audit entirely
 *
 * Exits non-zero if any file is missing, differs, or is reachable when it
 * should not be.
 */
import 'dotenv/config';
import {
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, sep } from 'path';
import { isPublicStorageFolder } from '../../libs/common/src/storage';

interface Args {
  root: string;
  quick: boolean;
  sample: number;
  audit: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const valueFor = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const sample = Number.parseInt(valueFor('--sample') ?? '5', 10);
  return {
    root: valueFor('--root') ?? join(process.cwd(), 'storage'),
    quick: argv.includes('--quick'),
    sample: Number.isInteger(sample) && sample > 0 ? sample : 5,
    audit: !argv.includes('--no-audit'),
  };
}

function requiredEnv() {
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

  return {
    bucket: S3_BUCKET,
    region: S3_REGION,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    endpoint: S3_ENDPOINT || undefined,
    forcePathStyle: S3_FORCE_PATH_STYLE === 'true',
    publicBaseUrl: S3_PUBLIC_BASE_URL?.replace(/\/+$/, '') || undefined,
  };
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
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
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

type Problem = { key: string; reason: string };

async function main() {
  const args = parseArgs();
  const config = requiredEnv();

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  console.log(`\nSource: ${args.root}`);
  console.log(`Bucket: ${config.bucket}`);
  console.log(
    `Mode:   ${args.quick ? 'size only (--quick)' : 'size + content hash'}\n`,
  );

  const missing: Problem[] = [];
  const mismatched: Problem[] = [];
  const unverifiable: Problem[] = [];
  const localKeys = new Set<string>();
  const publicSamples: string[] = [];
  const privateSamples: string[] = [];

  let checked = 0;
  let bytes = 0;

  for await (const absolutePath of walk(args.root)) {
    const key = relative(args.root, absolutePath).split(sep).join('/');

    // Same exclusion the migration applies, or every run would report the
    // dotfiles it deliberately skipped as missing.
    if (key.split('/').some((segment) => segment.startsWith('.'))) continue;

    localKeys.add(key);
    const top = key.split('/')[0] ?? '';
    const isPublic = isPublicStorageFolder(top);
    if (isPublic && publicSamples.length < args.sample) publicSamples.push(key);
    if (!isPublic && privateSamples.length < args.sample)
      privateSamples.push(key);

    const local = await stat(absolutePath);
    checked++;
    bytes += local.size;

    let head;
    try {
      head = await client.send(
        new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    } catch (error: any) {
      const status = error?.$metadata?.httpStatusCode;
      if (status === 404 || error?.name === 'NotFound') {
        missing.push({
          key,
          reason: `not in bucket (${formatBytes(local.size)} on volume)`,
        });
      } else {
        unverifiable.push({
          key,
          reason: `HEAD failed: ${error?.message ?? error}`,
        });
      }
      continue;
    }

    if (head.ContentLength !== local.size) {
      mismatched.push({
        key,
        reason: `size ${head.ContentLength} in bucket vs ${local.size} on volume`,
      });
      continue;
    }

    if (args.quick) continue;

    // For single-part uploads S3 sets ETag to the MD5 of the content, so the
    // bytes can be verified without downloading them. Multipart uploads use a
    // `<hash>-<parts>` form that is not comparable — the migration uploads
    // whole buffers, so that should not appear, and it is reported rather than
    // silently treated as a pass.
    const etag = head.ETag?.replace(/"/g, '') ?? '';
    if (!/^[0-9a-f]{32}$/i.test(etag)) {
      unverifiable.push({
        key,
        reason: `ETag "${etag}" is not a plain MD5; size matched`,
      });
      continue;
    }

    const localHash = createHash('md5')
      .update(await readFile(absolutePath))
      .digest('hex');
    if (localHash !== etag.toLowerCase()) {
      mismatched.push({
        key,
        reason: `content differs (volume ${localHash}, bucket ${etag})`,
      });
    }

    if (checked % 200 === 0) console.log(`  ...${checked} checked`);
  }

  // Objects in the bucket with no counterpart on the volume. Expected after the
  // cutover (new uploads land only in the bucket), so informational only.
  let orphans = 0;
  let continuationToken: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        ContinuationToken: continuationToken,
      }),
    );
    for (const object of page.Contents ?? []) {
      if (object.Key && !localKeys.has(object.Key)) orphans++;
    }
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);

  // --- Anonymous access audit -----------------------------------------------
  // The bucket policy is the difference between "avatars load" and "anyone who
  // guesses a key can read someone's resume". A copy that is byte-perfect but
  // world-readable is a worse outcome than a failed copy.
  const exposed: Problem[] = [];
  let auditRan = false;

  if (
    args.audit &&
    config.publicBaseUrl &&
    (publicSamples.length || privateSamples.length)
  ) {
    auditRan = true;
    console.log('\nAuditing anonymous access...');

    for (const key of publicSamples) {
      const url = `${config.publicBaseUrl}/${key}`;
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
          exposed.push({
            key,
            reason: `public object NOT reachable anonymously (HTTP ${response.status}) — avatars will break`,
          });
        }
      } catch (error: any) {
        exposed.push({
          key,
          reason: `public object unreachable: ${error?.message ?? error}`,
        });
      }
    }

    for (const key of privateSamples) {
      const url = `${config.publicBaseUrl}/${key}`;
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(15_000),
        });
        if (response.ok) {
          exposed.push({
            key,
            reason: `PRIVATE object readable anonymously (HTTP ${response.status}) — bucket policy is too broad`,
          });
        }
      } catch {
        // A network-level refusal is a pass: the object was not served.
      }
    }
  }

  // --- Report ---------------------------------------------------------------
  console.log('\n--- Summary ---');
  console.log(`Files on volume:  ${checked} (${formatBytes(bytes)})`);
  console.log(`Missing:          ${missing.length}`);
  console.log(`Mismatched:       ${mismatched.length}`);
  console.log(`Unverifiable:     ${unverifiable.length}`);
  console.log(`Bucket-only:      ${orphans} (expected after cutover)`);
  if (auditRan) {
    console.log(
      `Access audit:     ${publicSamples.length} public + ${privateSamples.length} private sampled, ${exposed.length} problem(s)`,
    );
  } else if (args.audit) {
    console.log(
      'Access audit:     SKIPPED — set S3_PUBLIC_BASE_URL to enable it',
    );
  }

  const show = (title: string, problems: Problem[]) => {
    if (!problems.length) return;
    console.error(`\n${title}`);
    for (const problem of problems.slice(0, 25)) {
      console.error(`  ${problem.key}: ${problem.reason}`);
    }
    if (problems.length > 25)
      console.error(`  ...and ${problems.length - 25} more`);
  };

  show('MISSING FROM BUCKET', missing);
  show('CONTENT MISMATCH', mismatched);
  show('ACCESS PROBLEMS', exposed);
  show('COULD NOT VERIFY', unverifiable);

  if (missing.length || mismatched.length) {
    console.error(
      '\nRe-run `npm run storage:migrate -- --apply --overwrite`, then verify again.',
    );
    console.error('Do NOT set STORAGE_DRIVER=s3 until this passes.');
    process.exit(1);
  }

  if (exposed.length) {
    console.error(
      '\nFix the bucket policy before switching — see docs/STORAGE.md §1.',
    );
    process.exit(1);
  }

  if (unverifiable.length) {
    console.error(
      '\nSome objects could not be verified. Investigate before switching.',
    );
    process.exit(1);
  }

  if (!auditRan && args.audit) {
    console.log(
      '\nCopy verified. The public/private boundary was NOT checked — confirm it by hand (docs/STORAGE.md §3).',
    );
  } else {
    console.log(
      '\nCopy verified and the access boundary holds. Safe to set STORAGE_DRIVER=s3.',
    );
  }
}

main().catch((error) => {
  console.error('\nStorage verification failed:', error);
  process.exit(1);
});
