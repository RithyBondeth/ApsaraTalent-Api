# File Storage

User files (avatars, company imagery, resumes, cover letters, chat attachments)
are written through a **storage driver**, selected by the `STORAGE_DRIVER`
environment variable:

| Driver | Where files live | When to use |
| --- | --- | --- |
| `local` (default) | `./storage` on the container filesystem | Local development |
| `s3` | Any S3-compatible bucket — AWS S3, Cloudflare R2, Backblaze B2, MinIO | **Production** |

The default is `local`, so nothing changes until S3 is explicitly enabled, and a
rollback is one environment variable plus a redeploy.

**Last verified: 2026-07-19**, against MinIO: 24 driver-level checks plus the
full 11-test e2e suite run twice — once per driver — with uploads confirmed
landing in the bucket.

---

## Why this exists

Uploads used to be written only to a Railway volume mounted at `/app/storage`.
Railway volumes have no automatic backup, so a volume failure meant permanent,
unrecoverable loss of user documents. Object storage replaces that with provider
durability.

## The URL contract does not change

This is the key design constraint, and the reason no data migration is needed.

The database stores **relative** paths — `/storage/employee-avatars/pic.png` —
and the web client resolves them at render time via `normalizeMediaUrl`. The
storage key is simply that path minus the `/storage/` prefix:

```text
database:  /storage/employee-avatars/pic.png
S3 key:    employee-avatars/pic.png
disk path: ./storage/employee-avatars/pic.png
```

So switching drivers changes *where the bytes are*, not *what any row says*.
**No database migration, no frontend change.**

## Public vs private

The top-level folder decides this, in `storage.constants.ts`:

- **Public** — `employee-avatars`, `company-avatars`, `company-covers`,
  `company-images`, `resume-templates`. Previously served by
  `useStaticAssets` with no auth check, so they stay world-readable.
- **Private** — `resumes`, `cover-letters`, `chat`. Only reachable through an
  authenticated endpoint that performs an ownership or participation check.

### How each is served

| | Public | Private |
| --- | --- | --- |
| Local driver | static middleware | authorized, then streamed |
| S3 driver | **302** to the public/CDN URL | authorized, then **streamed** through the API |

Private files are deliberately **not** redirected to presigned URLs, even though
the driver supports it. The web client fetches them with
`fetch(url, { credentials: 'include' })` and reads a blob; a cross-origin
redirect would then require the bucket to send
`Access-Control-Allow-Credentials: true` with an explicit origin, because
credentialed CORS forbids `*`. That is fragile configuration living outside this
repo, and getting it wrong breaks resume previews. Streaming keeps the exact
`200` + `Cache-Control: private, no-store` + `Content-Disposition` contract the
client already depends on.

Public images have no such constraint — they load via `<img>` — so redirecting
them keeps that bandwidth off the API entirely and lets a CDN cache them.

> If you later want to redirect private files too (to cut API bandwidth), pass
> `allowRedirect: true` to `serveStorageObject` **and** configure credentialed
> CORS on the bucket. Verify the resume preview dialog before shipping it.

---

## Rollout

Do this in order. Steps 1–3 are safe while the app keeps serving from the volume.

### 1. Create the bucket

Scope public-read to the public prefixes only. Everything else must stay
private. Example policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": ["*"] },
    "Action": ["s3:GetObject"],
    "Resource": [
      "arn:aws:s3:::<bucket>/employee-avatars/*",
      "arn:aws:s3:::<bucket>/company-avatars/*",
      "arn:aws:s3:::<bucket>/company-covers/*",
      "arn:aws:s3:::<bucket>/company-images/*",
      "arn:aws:s3:::<bucket>/resume-templates/*"
    ]
  }]
}
```

Verify before continuing: a public object returns 200 anonymously, and an object
under `resumes/` returns 403. Step 3 checks this automatically once files exist.

### ⚠️ Never put a Bucket Lock rule on the live bucket

R2 offers **Bucket Lock** (retention), not object versioning. It is tempting to
read "prevents deletions" as "protects my data". On the live bucket it does the
opposite of what you want: it blocks the application's own deletes, which is the
bug this whole migration exists to fix.

Confirmed in production on 2026-08-07 — with a lock rule active, `DeleteObject`
returned:

```
HTTP 409 ObjectLockedByBucketPolicy
"The object is locked by the bucket policy."
```

Two things saved that situation, and neither should be relied on again:

- the retention default is **`Indefinite`**, which would have made every object
  written under it undeletable *forever*, by anyone, including Cloudflare
  support. Always choose a finite period.
- R2 evaluates the policy at delete time rather than stamping it onto each
  object, so removing the rule restored normal deletes and nothing was lost.

**Bucket Lock belongs only on the backup bucket.** See "Backups" below.

Since neither versioning nor lock is available on the live bucket, recovery from
a bad delete comes entirely from the backup job. That is not a nice-to-have
here; it is the only copy.

### 2. Copy existing files into the bucket

Run from a machine that can reach the volume (or after downloading it). The
script only ever writes — never deletes — so it is safe to run repeatedly and
safe to run while the app is live.

```bash
export STORAGE_DRIVER=s3 S3_BUCKET=... S3_REGION=... \
       S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=...
# optional for non-AWS: S3_ENDPOINT, S3_FORCE_PATH_STYLE

npm run storage:migrate              # dry run — lists what it would upload
npm run storage:migrate -- --apply   # upload
```

It skips objects already present (so re-running resumes an interrupted copy),
ignores dotfiles, and sets public-read only on the public prefixes.

Note the skip is by key, not by content: an object left truncated by an
interrupted upload is *present*, so the copy step will not notice it. Step 3 is
what catches that.

### 3. Verify the copy

```bash
npm run storage:verify
```

Read-only. For every file on the volume it checks the bucket has an object of
the same size, and compares content by hash (S3 returns the MD5 as the object's
ETag, so this costs a HEAD rather than a download). It then samples public and
private keys and fetches them **anonymously** to confirm avatars are reachable
and resumes are not.

Exits non-zero on anything missing, differing, or wrongly exposed. Do not
continue until it passes.

```bash
npm run storage:verify -- --quick        # sizes only, for a very large volume
npm run storage:verify -- --sample 20    # widen the access audit
```

The anonymous audit needs `S3_PUBLIC_BASE_URL` set; without it the script says
the boundary was not checked rather than implying it passed. If you skip it,
confirm by hand that a public object returns 200 and a `resumes/` object does
not.

### 4. Flip the driver

Set on every API service in Railway (the gateway serves files; user-service
deletes them):

```properties
STORAGE_DRIVER=s3
S3_BUCKET=...
S3_REGION=...              # 'auto' for Cloudflare R2
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=...            # R2/MinIO/B2 only; omit for AWS
S3_FORCE_PATH_STYLE=true   # MinIO only
S3_PUBLIC_BASE_URL=...     # CDN / public bucket domain
S3_SIGNED_URL_EXPIRY_SECONDS=900
```

The app **refuses to boot** if `STORAGE_DRIVER=s3` and any required credential
is missing, rather than silently writing to an ephemeral disk.

Redeploy, then verify: upload a new avatar, preview a resume, send a chat
attachment.

### 5. Keep the volume

Do not detach it until you have confirmed everything serves from the bucket.
It is your rollback: unset `STORAGE_DRIVER` and redeploy.

Files uploaded *after* the switch exist only in the bucket, so once new uploads
have happened, rolling back leaves those missing. Roll back promptly or not at
all.

Before detaching the volume for good, run `npm run storage:verify` once more.
By then it will report bucket-only objects (everything uploaded since the
cutover) — that is expected and informational. What matters is that nothing on
the volume is missing from the bucket.

---

## Backups

The live bucket has no versioning and no lock, so it holds exactly one copy of
every user resume and avatar. `.github/workflows/storage-backup.yml` runs nightly
and copies objects into a second, locked bucket the application cannot reach.

| Bucket | Lock | Who can write |
|---|---|---|
| `apsaratalent-uploads` | none | the app — read, write, delete |
| `apsaratalent-uploads-backup` | **30 days** | the backup job only |

Three properties make this work, and removing any one of them defeats it:

1. **Append-only.** The job never deletes from the backup bucket. A mirror that
   propagated deletions would faithfully replicate the disaster it exists to
   prevent.
2. **A separate token.** The app's credentials must have no access to the backup
   bucket, so a leaked or compromised app key cannot destroy the backups along
   with the originals. This is the property versioning could not have given you.
3. **A finite lock.** 30 days is long enough to notice a bad delete and short
   enough that mistakes age out. Never `Indefinite`.

### Setting it up

1. Create `apsaratalent-uploads-backup` in the same region.
2. On that bucket only: Bucket Lock Rules → enable, retention **30 days**.
3. Create a second Account API Token, Object Read & Write, scoped to **both**
   buckets — it reads live and writes backup.
4. Add repository secrets: `S3_ENDPOINT`, `S3_LIVE_BUCKET`, `S3_BACKUP_BUCKET`,
   `S3_BACKUP_ACCESS_KEY_ID`, `S3_BACKUP_SECRET_ACCESS_KEY`.
5. Run the workflow manually with **dry run** checked, then for real.

### Restoring

Objects keep their original keys in the backup bucket, so recovery is a copy in
the other direction — no transformation, no manifest to interpret. For a single
file, copy that key back. For a bulk restore, reverse the buckets in
`scripts/ci/backup-storage.mjs`.

**Rehearse it before you need it.** An untested backup is a belief, not a
backup — the same lesson the rollback workflow taught on 2026-08-07, when its
first real exercise revealed it had never been able to work.

## Local development

Nothing to do — `STORAGE_DRIVER` defaults to `local`.

To exercise the S3 path locally, MinIO is the quickest option:

```bash
docker run -d --name minio -p 9000:9000 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio:latest server /data
```

```properties
STORAGE_DRIVER=s3
S3_BUCKET=apsara-dev
S3_REGION=us-east-1
S3_ENDPOINT=http://127.0.0.1:9000
S3_FORCE_PATH_STYLE=true        # required for MinIO
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_PUBLIC_BASE_URL=http://127.0.0.1:9000/apsara-dev
```

Note `S3_FORCE_PATH_STYLE=true` — MinIO does not support virtual-host-style
bucket addressing by default.

## Code map

| File | Role |
| --- | --- |
| `libs/common/src/storage/storage.service.ts` | Entry point; owns path ⇄ key mapping |
| `libs/common/src/storage/local-storage.driver.ts` | Filesystem driver (blocks path traversal) |
| `libs/common/src/storage/s3-storage.driver.ts` | S3-compatible driver |
| `libs/common/src/storage/upload-storage.engine.ts` | Multer engine; picks driver **per request** |
| `libs/common/src/storage/serve-storage-object.ts` | Redirect-vs-stream policy |
| `libs/common/src/storage/storage.registry.ts` | Static handle for multer (which cannot use DI) |
| `apps/api-gateway/src/storage/controllers/public-storage.controller.ts` | Serves `/storage/<folder>/<path>` |
| `scripts/storage/migrate-storage-to-s3.ts` | Volume → bucket copy |
| `scripts/storage/verify-storage-migration.ts` | Proves the copy is complete and the access boundary holds |

### Gotcha: multer and dependency injection

Multer storage engines are built at decoration time, before Nest has an
injector, so they cannot receive `StorageService` normally. `StorageModule`
publishes the instance into `StorageRegistry` at boot and the engine reads it
per request. `chat-upload.config.ts` in particular is a module-level constant
evaluated at import time — choosing a driver eagerly there would always pick the
local disk and silently ignore `STORAGE_DRIVER=s3`.
