# Backup, Restore & Rollback Runbook

Operational procedures for the Apsara Talent API. Written to be followed while
something is on fire, so the steps are literal and the caveats are inline.

**Last verified: 2026-07-18.** The `pg_dump`/`pg_restore` procedures below were
tested end-to-end against PostgreSQL 16 with pgvector: dump → restore into an
empty database → row counts, index counts, the `migrations` table and a
1536-dimension `vector` column all came back identical. Items marked
⚠️ **UNVERIFIED** depend on provider settings nobody has confirmed yet.

---

## 1. Where the state actually lives

| Store | Contains | Survives redeploy? | Backed up? |
| --- | --- | --- | --- |
| **Neon Postgres** | All application data, incl. `refreshToken` on `user` | Yes | Neon PITR (⚠️ retention unconfirmed) + manual `pg_dump` |
| **Railway volume** on api-gateway, `/app/storage` | Uploaded resumes, cover letters, chat attachments, avatars, company images | Yes, if the volume is mounted | ❌ **NO** |
| **Redis** | Cache, AI quota counters, rate-limit windows, Socket.IO adapter | No | Not needed — see below |
| **Vercel** (web) | Built frontend only | n/a | n/a (immutable deployments) |

### Redis is disposable

Verified by reading the code: `RedisService` exposes only cache reads/writes,
`hitRateLimit`, and `invalidate*` helpers. `AuthGuard` uses it purely as a
read-through cache of the `User` row. Refresh tokens live in Postgres
(`user.refreshToken`), **not** Redis.

**Consequence:** flushing or losing Redis is safe. It causes a latency spike as
caches refill and resets in-flight rate-limit windows. It does not log anyone
out and does not lose data. Do not spend incident time trying to recover Redis.

### The storage volume 🚩 — mitigation available, not yet enabled

`/app/storage` holds `resumes`, `cover-letters`, `chat`, `employee-avatars`,
`company-avatars`, `company-covers`, `company-images`. This is user-generated
content with **no second copy** — there is no Firestore mirror in the current
codebase, despite chat backup having been discussed historically.

Railway volumes are not automatically backed up. **If that volume is lost, the
files are gone**, and the database will still hold rows pointing at them, so the
app will render broken links rather than fail loudly.

**Object storage support now exists** and removes this risk once enabled: set
`STORAGE_DRIVER=s3` and files move to a durable bucket. See
[STORAGE.md](./STORAGE.md) for the rollout procedure.

Until that switch is made in production, everything above still applies — the
capability being merged is not the same as the risk being closed.

---

## 2. Taking a backup

### Routine / before any risky change

```bash
DATABASE_URL="<production-url>" ./scripts/db/backup-db.sh ./backups
```

The script is read-only and safe. It:

- strips Neon's `-pooler` suffix (see below),
- prints the target host with credentials masked so you can catch a wrong target,
- writes `backups/apsara-<UTC-timestamp>.dump` in `pg_dump` custom format,
- verifies the dump is listable, and **deletes it if the dump failed** — a
  half-written file that looks like a backup is worse than none,
- falls back to running `pg_dump` inside Docker when no local client exists.

> **Neon: use the direct endpoint, not the pooler.**
> Production `DATABASE_URL` points at `...-pooler.eastus2.azure.neon.tech`. That
> is a transaction-pooled (pgbouncer) endpoint. `pg_dump` needs a real session —
> it sets session state and holds a consistent snapshot — so it can fail or
> produce an inconsistent dump through a pooler. The script removes `-pooler`
> automatically; if you run `pg_dump` by hand, remove it yourself.
>
> **`pg_dump` must be ≥ the server version.** Neon upgrades Postgres on their
> schedule. If you see `server version mismatch`, use the Docker path (the
> script already does) and bump `PG_IMAGE` in the script to match.

### Neon point-in-time restore

Neon provides PITR via history retention, and restoring is a *branch* operation
rather than a file restore. This is the fastest path for "we ran a bad UPDATE
ten minutes ago."

⚠️ **UNVERIFIED — do this before you need it:** open the Neon console and
confirm (a) the current **history retention window** on your plan, and (b) that
PITR is enabled for this project. Free/lower tiers have a short window. Write the
actual number here:

Neon history retention: ____________  (checked by ________ on ____________)

---

## 3. Restoring the database

Restores are deliberately **not** scripted. Each step should be read by a human
who is looking at the target.

### Step 0 — stop writes first

A restore into a database that is still taking traffic produces a mix of old and
new rows. In Railway, scale the API services to 0 replicas, or remove the
gateway's public domain, before restoring.

### Option A — Neon PITR (preferred for recent, logical mistakes)

1. Neon console → project → **Branches** → create a branch from a timestamp
   *before* the incident.
2. Query the branch and confirm the data looks right **before** touching prod.
3. Repoint `DATABASE_URL` at the restored branch, or promote it per Neon's
   current docs.
4. Redeploy the services so they pick up the new connection string.
5. Run `npm run migration:show` and confirm the branch's migration state matches
   what the deployed code expects.

Restoring to a point in time rewinds schema *and* data together, so a branch
taken from before a bad migration will also lack that migration — which is
correct, and `migration:show` will show it as pending.

### Option B — restore a `pg_dump` into an empty database

Verified working with the exact flags below.

```bash
# 1. Create an empty target (a new Neon branch, or a fresh database).
# 2. Restore. --exit-on-error means you find out immediately, not silently.
docker run --rm -i --network host pgvector/pgvector:pg16 \
  pg_restore --no-owner --no-privileges --exit-on-error \
  -d "<direct-target-url>" < backups/apsara-<timestamp>.dump
```

Then verify before sending traffic:

```sql
SELECT count(*) FROM "user";
SELECT count(*) FROM migrations;          -- expect 9 as of 2026-07-18
SELECT count(*) FROM pg_index WHERE indisvalid = false;   -- expect 0
SELECT vector_dims(embedding) FROM career_scope WHERE embedding IS NOT NULL LIMIT 1;  -- expect 1536
```

The `migrations` table is included in the dump, so a restored database correctly
reports its own migration state — confirmed: `migration:show` reported all 9 as
applied against a freshly restored copy.

### Step N — after any restore

- Flush Redis (or just let it expire) so cached rows don't contradict restored ones.
- Re-check that `/app/storage` still matches the restored rows. Restoring the
  database to an earlier point does **not** restore deleted files, and vice
  versa. Expect dangling references; they surface as broken images/downloads.

---

## 4. Rolling back a deployment

### Web (Vercel)

Vercel deployments are immutable. Use **Instant Rollback** in the dashboard, or
promote the previous production deployment. No database implications *provided*
the schema has not moved on — see §5.

### API (Railway)

Each of the 7 deployed services is rolled back independently: Railway service →
**Deployments** → pick the last known-good → **Redeploy**.

Because they are separate services, a partial rollback is possible and is
usually wrong. Decide up front whether you are rolling back *all* API services
or just one; mixed versions communicating over TCP RPC is its own outage.

`restartPolicyType = "ON_FAILURE"` with 10 retries means a service
crash-looping on bad config will retry and then stay down. The checked-in
Railway configs also allow a 20-second rollout overlap and a 30-second graceful
drain window. Check deploy logs before assuming a rollback failed.

---

## 5. Rolling back a migration ⚠️ read before acting

**The order matters, and the safe order is the reverse of deploying.**

Code and schema are deployed separately: CI runs migrations (the `migrate` job)
*before* redeploying services. Rolling back therefore means:

1. **Roll the application back first** (§4), so no running code depends on the
   new schema.
2. **Only then** consider reverting the migration.

```bash
DATABASE_URL="<production-url>" npm run migration:revert   # reverts ONE migration
```

### When NOT to revert

- **If the migration was purely additive** (a new nullable column, a new index),
  leave it. Old code ignores it. Reverting buys nothing and risks data loss.
- **If `down()` is a no-op**, reverting will *not* restore anything. Two
  migrations are deliberately irreversible and say so in their comments:
  `NormalizeExperienceLevels` (a many-to-one string mapping — the original values
  are unrecoverable) and the enum labels in `AddChatAudio` (Postgres cannot drop
  an enum value). For those, restore from backup or accept the current state.
- **If the migration dropped a column or table**, `down()` recreates the
  structure but **not the data**. Restore from backup instead.

`migration:revert` only ever undoes the single most recent migration; run it
repeatedly to go further back. See `migrations/README.md` for the full details,
including why `down()` must never use `CONCURRENTLY`.

---

## 6. Incident quick reference

| Symptom | First move |
| --- | --- |
| Bad deploy, schema unchanged | Roll back the app (§4). Do not touch the DB. |
| Bad deploy after an additive migration | Roll back the app only. Leave the migration. |
| Bad data change (bad UPDATE/DELETE) | Neon PITR branch (§3 Option A). Do not `migration:revert`. |
| Migration failed part-way | It ran in a transaction and rolled itself back — except the two non-transactional ones. Check for invalid indexes (`migrations/README.md`), then re-run: every migration is idempotent. |
| Total database loss | Restore latest dump (§3 Option B), then reconcile `/app/storage`. |
| Redis down / flushed | Nothing to do. Latency spike only; no data loss. |
| Broken images / missing resumes | Storage volume issue, not a DB issue. See §1. |

---

## 7. Open action items

These are known gaps, not solved problems. Do not read this runbook as evidence
they are handled.

1. **The `/app/storage` volume has no backups — mitigation built, not yet
   enabled.** Object-storage support is merged and verified; production is still
   on `STORAGE_DRIVER=local`. Follow [STORAGE.md](./STORAGE.md) to copy the
   volume into a bucket and flip the driver. Until then, a volume failure is
   still unrecoverable data loss.
2. **Neon retention window is unconfirmed.** Fill in the blank in §2. PITR you
   have not checked is not a backup strategy.
3. **No restore has been rehearsed against real production data.** The procedure
   here is verified against a representative schema, not against prod's size.
   Restore timing on a real dataset is unknown — schedule a drill into a scratch
   Neon branch and record how long it took.
4. **Staging provisioning is unconfirmed.** The manual load workflow now
   accepts only the repository's `STAGING_API_URL` variable, but this does not
   create or validate the provider environment. Confirm the environment exists
   before relying on it.
5. **Backups are manual.** `scripts/db/backup-db.sh` must be run by a person. At
   minimum, run it before any migration or risky deploy; better, schedule it.
