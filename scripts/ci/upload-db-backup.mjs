/**
 * Upload a pg_dump produced by scripts/db/backup-db.sh into the locked R2
 * backup bucket.
 *
 * Neon's own restore points all live inside the same Neon project as the data,
 * so a project-level or account-level loss takes both. This is the only copy
 * that leaves Neon — RUNBOOK §7 called it out as "still manual", and manual
 * meant it was not happening.
 *
 * It lands in the same 30-day-locked bucket as the file backups, so once
 * written a dump cannot be deleted or overwritten by anyone, including a
 * compromised credential. That matters more here than for files: Neon's
 * point-in-time window is 1 day (measured 2026-08-08), so anything older than
 * 24 hours exists only in these dumps.
 *
 *   node scripts/ci/upload-db-backup.mjs <dump-file>
 *
 * Environment: the same S3_* backup credentials the file backup job uses.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename } from 'node:path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const file = process.argv[2];
if (!file) throw new Error('Usage: node scripts/ci/upload-db-backup.mjs <dump-file>');

const endpoint = process.env.S3_ENDPOINT?.trim();
const bucket = process.env.S3_BACKUP_BUCKET?.trim();
const accessKeyId = process.env.S3_BACKUP_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.S3_BACKUP_SECRET_ACCESS_KEY?.trim();

const missing = [
  !endpoint && 'S3_ENDPOINT',
  !bucket && 'S3_BACKUP_BUCKET',
  !accessKeyId && 'S3_BACKUP_ACCESS_KEY_ID',
  !secretAccessKey && 'S3_BACKUP_SECRET_ACCESS_KEY',
].filter(Boolean);
if (missing.length) {
  throw new Error(`Database backup upload is not configured. Missing: ${missing.join(', ')}`);
}

const { size } = await stat(file);
if (size === 0) {
  // A zero-byte dump is the worst outcome: it uploads fine, looks like a
  // backup, and restores nothing.
  throw new Error(`${file} is empty. pg_dump produced no output — do not treat this as a backup.`);
}

// Date-prefixed so the bucket sorts chronologically and a human can find
// "the dump from before the incident" without reading metadata.
const key = `database/${new Date().toISOString().slice(0, 10)}/${basename(file)}`;

const s3 = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

console.log(`Uploading ${(size / 1024 / 1024).toFixed(1)} MB -> ${bucket}/${key}`);

try {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(file),
      ContentLength: size,
      ContentType: 'application/octet-stream',
    }),
  );
} catch (error) {
  const name = error?.name || '';
  if (/AccessDenied|Unauthorized|InvalidAccessKeyId/i.test(name)) {
    throw new Error(
      `${name}: the backup token cannot write to ${bucket}. It needs Object Read & Write.`,
    );
  }
  if (/ObjectLocked/i.test(name)) {
    throw new Error(
      `${name}: an object already exists at ${key} and is immutable. Two backups ran ` +
        'for the same day with the same filename — stagger them or include the time.',
    );
  }
  throw error;
}

console.log(`Uploaded. Immutable for the bucket's retention period (30 days).`);
console.log(`Restore with: docs/RUNBOOK.md §3 Option B`);
