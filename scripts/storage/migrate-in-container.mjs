/**
 * Copy the Railway storage volume into the S3 bucket, then prove the copy.
 *
 * This exists because `npm run storage:migrate` cannot run where the data is.
 * That script needs ts-node, which `npm prune --omit=dev` removes from the
 * production image — and the volume is only mounted inside that image, so it is
 * unreachable from a laptop. This is the same job in plain ESM, using the
 * @aws-sdk/client-s3 that ships as a production dependency:
 *
 *   railway ssh --service "API Gateway" -- node scripts/storage/migrate-in-container.mjs
 *   railway ssh --service "API Gateway" -- node scripts/storage/migrate-in-container.mjs --apply
 *   railway ssh --service "API Gateway" -- node scripts/storage/migrate-in-container.mjs --verify
 *
 * Dry run by default. Only ever writes — never deletes — so it is safe to run
 * repeatedly and safe to run while the app is live and still serving from the
 * volume. Re-running resumes an interrupted copy.
 *
 * Reads the same S3_* variables the application does, so if the app can talk to
 * the bucket, so can this.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const ROOT = process.env.STORAGE_LOCAL_ROOT || '/app/storage';

// Mirrors the bucket policy in docs/STORAGE.md. Everything not listed here —
// resumes, cover letters, chat attachments — must stay private.
const PUBLIC_PREFIXES = [
  'employee-avatars/',
  'company-avatars/',
  'company-covers/',
  'company-images/',
  'resume-templates/',
];

// Not user data: filesystem bookkeeping and editor droppings.
const SKIP_ENTRIES = new Set(['lost+found', '.DS_Store', 'Thumbs.db']);

const apply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');

const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION || 'auto';
const endpoint = process.env.S3_ENDPOINT;
const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, '');

if (!bucket) {
  throw new Error(
    'S3_BUCKET is required. Set the S3_* variables on this service first ' +
      '(docs/STORAGE.md §4) — this script reads exactly what the app reads.',
  );
}

const s3 = new S3Client({
  region,
  ...(endpoint ? { endpoint } : {}),
  ...(process.env.S3_FORCE_PATH_STYLE === 'true'
    ? { forcePathStyle: true }
    : {}),
  ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

const isPublic = (key) => PUBLIC_PREFIXES.some((p) => key.startsWith(p));

const CONTENT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const contentTypeFor = (key) =>
  CONTENT_TYPES[key.split('.').pop()?.toLowerCase()] ||
  'application/octet-stream';

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    if (SKIP_ENTRIES.has(entry.name) || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

async function collect() {
  const files = [];
  for await (const path of walk(ROOT)) {
    // S3 keys always use forward slashes, whatever the platform separator is.
    const key = relative(ROOT, path).split(sep).join('/');
    const { size } = await stat(path);
    files.push({ path, key, size });
  }
  return files.sort((a, b) => a.key.localeCompare(b.key));
}

/** Turn SDK failures into something actionable at 3am. */
function explain(error) {
  const name = error?.name || '';
  if (/CredentialsProviderError|InvalidAccessKeyId|SignatureDoesNotMatch/i.test(name)) {
    return new Error(
      `S3 credentials rejected or missing (${name}). Set S3_ACCESS_KEY_ID and ` +
        'S3_SECRET_ACCESS_KEY on this service — see docs/STORAGE.md §4. ' +
        'Nothing was written.',
    );
  }
  if (/NoSuchBucket/i.test(name)) {
    return new Error(
      `Bucket "${bucket}" does not exist or is not visible to these credentials. Nothing was written.`,
    );
  }
  if (/AccessDenied/i.test(name)) {
    return new Error(
      `Access denied on "${bucket}". The credentials need s3:PutObject and ` +
        's3:GetObject on this bucket. Nothing was written.',
    );
  }
  return error;
}

async function head(key) {
  try {
    return await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') {
      return null;
    }
    throw explain(error);
  }
}

async function upload(file) {
  const body = await readFile(file.path);
  const command = {
    Bucket: bucket,
    Key: file.key,
    Body: body,
    ContentType: contentTypeFor(file.key),
  };
  try {
    // Buckets with Object Ownership set to "bucket owner enforced" (and R2)
    // reject ACLs outright. Public access there comes from the bucket policy,
    // so a rejected ACL is not an error — falling back keeps the copy moving
    // and the anonymous audit below still proves the boundary either way.
    await s3.send(
      new PutObjectCommand(
        isPublic(file.key) ? { ...command, ACL: 'public-read' } : command,
      ),
    );
  } catch (error) {
    if (
      isPublic(file.key) &&
      /AccessControlListNotSupported|InvalidArgument|NotImplemented/i.test(
        error?.name || error?.Code || '',
      )
    ) {
      await s3.send(new PutObjectCommand(command));
      return 'uploaded (ACL unsupported — relying on bucket policy)';
    }
    throw explain(error);
  }
  return 'uploaded';
}

const files = await collect();
if (files.length === 0) {
  console.log(`No files under ${ROOT}. Nothing to migrate.`);
  process.exit(0);
}

const total = files.reduce((n, f) => n + f.size, 0);
console.log(
  `${files.length} files, ${(total / 1024 / 1024).toFixed(1)} MB under ${ROOT}`,
);
console.log(`bucket: ${bucket}${endpoint ? ` (${endpoint})` : ''}\n`);

// ---------------------------------------------------------------- copy ------
if (!verifyOnly) {
  let uploaded = 0;
  let skipped = 0;
  for (const file of files) {
    const existing = await head(file.key);
    if (existing) {
      skipped += 1;
      continue;
    }
    if (!apply) {
      console.log(`  would upload  ${file.key}`);
      uploaded += 1;
      continue;
    }
    const outcome = await upload(file);
    console.log(`  ${outcome.padEnd(12)} ${file.key}`);
    uploaded += 1;
  }
  console.log(
    `\n${apply ? 'uploaded' : 'would upload'} ${uploaded}, already present ${skipped}`,
  );
  if (!apply) {
    console.log('\nDRY RUN — nothing was written. Re-run with --apply.');
    process.exit(0);
  }
}

// -------------------------------------------------------------- verify ------
// The copy skips by key, not by content, so an object left truncated by an
// interrupted upload counts as "present". This is the step that catches that.
console.log('\nVerifying...');
const problems = [];

for (const file of files) {
  const remote = await head(file.key);
  if (!remote) {
    problems.push(`missing: ${file.key}`);
    continue;
  }
  if (Number(remote.ContentLength) !== file.size) {
    problems.push(
      `size differs: ${file.key} (local ${file.size}, remote ${remote.ContentLength})`,
    );
    continue;
  }
  // S3 returns the MD5 as the ETag for single-part uploads. A multipart ETag
  // contains a dash and cannot be compared this way — size is all we have then.
  const etag = (remote.ETag || '').replace(/"/g, '');
  if (!etag.includes('-')) {
    const md5 = createHash('md5')
      .update(await readFile(file.path))
      .digest('hex');
    if (md5 !== etag) problems.push(`content differs: ${file.key}`);
  }
}

// --------------------------------------------------- access boundary --------
// Fetched anonymously, with no credentials, because that is the only way to
// prove what the internet can actually reach.
if (publicBaseUrl) {
  const publicSample = files.filter((f) => isPublic(f.key)).slice(0, 5);
  const privateSample = files.filter((f) => !isPublic(f.key)).slice(0, 5);

  for (const file of publicSample) {
    const response = await fetch(`${publicBaseUrl}/${file.key}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      problems.push(
        `public object is NOT reachable anonymously (${response.status}): ${file.key}`,
      );
    }
  }
  for (const file of privateSample) {
    const response = await fetch(`${publicBaseUrl}/${file.key}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) {
      problems.push(`PRIVATE OBJECT IS PUBLICLY READABLE: ${file.key}`);
    }
  }
  console.log(
    `  access audit: ${publicSample.length} public + ${privateSample.length} private keys checked anonymously`,
  );
} else {
  console.log(
    '  access audit: SKIPPED — set S3_PUBLIC_BASE_URL to check the public/private boundary.\n' +
      '  Until then, confirm by hand that an avatar returns 200 and a resume does not.',
  );
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\nDo not flip STORAGE_DRIVER=s3 until this passes.');
  process.exit(1);
}

console.log(`\nVerified ${files.length} files. Safe to proceed to STORAGE.md §4.`);
