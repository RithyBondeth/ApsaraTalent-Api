/**
 * Copy every object in the live uploads bucket into the backup bucket.
 *
 * This is the only thing standing between a bad delete and permanent loss of
 * user resumes and avatars. R2 has no object versioning, and Bucket Lock cannot
 * be used on the live bucket — it blocks the app's own legitimate deletes,
 * which is precisely the bug the S3 migration existed to fix (confirmed the
 * hard way on 2026-08-07: DeleteObject returned 409 ObjectLockedByBucketPolicy
 * while a lock rule was active on the live bucket).
 *
 * So the protection lives one layer out:
 *
 *   apsaratalent-uploads         live    no lock   app can read/write/delete
 *   apsaratalent-uploads-backup  backup  LOCKED    only this job can write
 *
 * APPEND-ONLY, and that is the entire point. This job never deletes from the
 * backup bucket. A mirror that propagated deletions would faithfully replicate
 * the disaster it is supposed to protect against. Objects age out through the
 * backup bucket's own lifecycle rule, never through this script.
 *
 * Copies are server-side (CopyObject), so object bytes never travel through the
 * runner — a 3 MB or 3 GB bucket costs the same here.
 *
 * Usage:  node scripts/ci/backup-storage.mjs [--dry-run]
 *
 * Environment (all required unless noted):
 *   S3_ENDPOINT                  https://<account>.r2.cloudflarestorage.com
 *   S3_LIVE_BUCKET               source, read-only for this job
 *   S3_BACKUP_BUCKET             destination, write-only in practice
 *   S3_BACKUP_ACCESS_KEY_ID      token with read on live + write on backup
 *   S3_BACKUP_SECRET_ACCESS_KEY
 *
 * This token is deliberately NOT the application's. The app must never hold
 * credentials that can reach the backup bucket, or a compromised app key could
 * destroy the backups along with the originals.
 */
import {
  CopyObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';

const dryRun = process.argv.includes('--dry-run');

const endpoint = process.env.S3_ENDPOINT?.trim();
const liveBucket = process.env.S3_LIVE_BUCKET?.trim();
const backupBucket = process.env.S3_BACKUP_BUCKET?.trim();
const accessKeyId = process.env.S3_BACKUP_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.S3_BACKUP_SECRET_ACCESS_KEY?.trim();

const missing = [
  !endpoint && 'S3_ENDPOINT',
  !liveBucket && 'S3_LIVE_BUCKET',
  !backupBucket && 'S3_BACKUP_BUCKET',
  !accessKeyId && 'S3_BACKUP_ACCESS_KEY_ID',
  !secretAccessKey && 'S3_BACKUP_SECRET_ACCESS_KEY',
].filter(Boolean);

if (missing.length > 0) {
  // Loud, not fatal-by-accident: a missing backup is a real problem, but it
  // should read as "not configured yet", not as a mysterious crash.
  console.error(`Storage backup is not configured. Missing: ${missing.join(', ')}`);
  console.error('See docs/STORAGE.md — "Backups" — for how to create the bucket and token.');
  process.exit(1);
}

if (liveBucket === backupBucket) {
  throw new Error(
    'S3_LIVE_BUCKET and S3_BACKUP_BUCKET are the same bucket. A backup in the ' +
      'same bucket protects against nothing.',
  );
}

const s3 = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

/** Every key in a bucket, following pagination. */
async function listAll(bucket) {
  const keys = new Map();
  let token;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    for (const object of page.Contents ?? []) {
      keys.set(object.Key, object.Size);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

const started = Date.now();
const live = await listAll(liveBucket);
const backup = await listAll(backupBucket);

console.log(`live:   ${live.size} objects in ${liveBucket}`);
console.log(`backup: ${backup.size} objects in ${backupBucket}`);

// Copy anything missing, or anything whose size differs — a size mismatch means
// the object was replaced, and the backup copy is stale.
const pending = [...live.entries()].filter(
  ([key, size]) => !backup.has(key) || backup.get(key) !== size,
);

if (pending.length === 0) {
  console.log('\nBackup is already current. Nothing to copy.');
} else {
  console.log(`\n${dryRun ? 'would copy' : 'copying'} ${pending.length} object(s):`);
  let copied = 0;
  const failures = [];
  for (const [key] of pending) {
    if (dryRun) {
      console.log(`  would copy  ${key}`);
      continue;
    }
    try {
      await s3.send(
        new CopyObjectCommand({
          Bucket: backupBucket,
          // CopySource is /<bucket>/<key> and must be URI-encoded: these keys
          // contain slashes and timestamps, and an unencoded one silently
          // copies the wrong object or 404s.
          CopySource: `/${liveBucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`,
          Key: key,
        }),
      );
      copied += 1;
      console.log(`  copied      ${key}`);
    } catch (error) {
      // An object already under retention cannot be overwritten. That is the
      // lock doing its job, not a failure — the older copy is still there.
      if (/ObjectLocked|AccessDenied|PreconditionFailed/i.test(error?.name || '')) {
        console.log(`  retained    ${key} (immutable copy already in backup)`);
        continue;
      }
      failures.push(`${key}: ${error?.name || error}`);
    }
  }
  if (!dryRun) console.log(`\ncopied ${copied} of ${pending.length}`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} object(s) failed to back up:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
}

// Orphans are expected and are the whole value of an append-only backup: they
// are objects deleted from live that the backup still holds. Reporting the
// count makes an unexpected mass deletion visible the next morning.
const orphans = [...backup.keys()].filter((key) => !live.has(key));
console.log(
  `\nbackup holds ${orphans.length} object(s) no longer in live` +
    (orphans.length > 0 ? ' — these are recoverable deletions' : ''),
);
console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
