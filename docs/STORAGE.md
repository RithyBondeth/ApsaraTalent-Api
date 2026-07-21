# File Storage

User files (avatars, company imagery, resumes, cover letters, chat attachments)
are written through a **storage driver**, selected by the `STORAGE_DRIVER`
environment variable:

| Driver | Where files live | When to use |
|---|---|---|
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

```
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
|---|---|---|
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
under `resumes/` returns 403.

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

### 3. Spot-check the copy

Confirm a handful of avatars load anonymously and that a resume does **not**.

### 4. Flip the driver

Set on every API service in Railway (the gateway serves files; user-service
deletes them):

```
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

---

## Local development

Nothing to do — `STORAGE_DRIVER` defaults to `local`.

To exercise the S3 path locally, MinIO is the quickest option:

```bash
docker run -d --name minio -p 9000:9000 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio:latest server /data
```

```
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
|---|---|
| `libs/common/src/storage/storage.service.ts` | Entry point; owns path ⇄ key mapping |
| `libs/common/src/storage/local-storage.driver.ts` | Filesystem driver (blocks path traversal) |
| `libs/common/src/storage/s3-storage.driver.ts` | S3-compatible driver |
| `libs/common/src/storage/upload-storage.engine.ts` | Multer engine; picks driver **per request** |
| `libs/common/src/storage/serve-storage-object.ts` | Redirect-vs-stream policy |
| `libs/common/src/storage/storage.registry.ts` | Static handle for multer (which cannot use DI) |
| `apps/api-gateway/src/storage/controllers/public-storage.controller.ts` | Serves `/storage/<folder>/<path>` |
| `scripts/migrate-storage-to-s3.ts` | Volume → bucket copy |

### Gotcha: multer and dependency injection

Multer storage engines are built at decoration time, before Nest has an
injector, so they cannot receive `StorageService` normally. `StorageModule`
publishes the instance into `StorageRegistry` at boot and the engine reads it
per request. `chat-upload.config.ts` in particular is a module-level constant
evaluated at import time — choosing a driver eagerly there would always pick the
local disk and silently ignore `STORAGE_DRIVER=s3`.
