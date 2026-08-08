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
| **Neon Postgres** | All application data, incl. `refreshToken` on `user` | Yes | Neon PITR (**1 day**) + nightly off-Neon `pg_dump` into the locked bucket |
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

### Automatic, before every production migration

The `migrate` job creates a Neon branch as a restore point immediately before
`migration:run`, and the release **stops** if it cannot. The branch id and name
are printed in that job's step summary — that is the thing to restore from if a
migration goes wrong.

```bash
# Same thing by hand, e.g. before a manual data fix. Reads NEON_API_KEY and
# NEON_PROJECT_ID from your local .env; pass them inline to override.
npm run db:restore-point
```

Branches are named `ci-restore-point/<UTC-timestamp>-<sha>`. The script keeps
the 10 most recent and prunes older ones — it only ever deletes branches under
that exact prefix, so a branch you created by hand is never touched. Override
with `RESTORE_POINT_KEEP`, or set it to `0` to disable pruning (and then watch
the project branch limit yourself).

These are storage-only branches with no compute attached, so they cost storage
and nothing else until someone attaches an endpoint during a recovery.

### Routine / before any risky change

A restore point is a Neon-side snapshot; a `pg_dump` is a file you can carry off
Neon entirely. Take one before anything that a branch would not save you from —
a provider migration, a destructive backfill, or a plan change that could shorten
the retention window.

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

Neon history retention: **1 day** (checked automatically by the daily
`Infrastructure drift` workflow — first measured 2026-08-08)

⚠️ **One day is short.** Anything noticed more than 24 hours after it
happened cannot be recovered from Neon at all. The nightly off-Neon dump
(§2) is the only thing covering a longer window. Raising this requires a
Neon plan change.

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

### Web (Vercel) — automatic

The `deploy` job verifies the new deployment and, if verification fails, runs
`vercel rollback` itself: the production alias goes back to the previous
deployment without anyone being paged. The workflow summary says whether the
rollback succeeded, and the run fails loudly if it did not.

You still need **Instant Rollback** in the dashboard when the failure is found
later — by users, by Sentry, by a metric — rather than by the deploy's own
health check. Deployments are immutable, so this is always available.

No database implications *provided* the schema has not moved on — see §5.

### API (Railway) — one workflow, human-triggered

Run the **Roll back Railway services** workflow (Actions → Run workflow):

- `service: all` covers the 7 RPC-coupled application services, in the same
  order as a deploy (internal services first, gateway last).
- Named services roll back individually, including the monitoring components.
- `apply` is **off by default**. The first run prints the current and target
  deployment for each service and changes nothing. Read that table, then re-run
  with `apply` checked.

It aborts without touching anything if any targeted service has no earlier
successful deployment to return to — a partial rollback is worse than none.
After `service: all` it re-verifies `/health/ready` automatically.

This is deliberately not automatic on a failed deploy. Rolling back a subset
leaves mixed versions communicating over TCP RPC, which is its own outage, so
the scope decision stays with a person. Decide *before* you run it whether you
are rolling back all API services or one.

The dashboard path still works if the workflow itself is broken: Railway
service → **Deployments** → last known-good → **Redeploy**.

#### A deploy that stopped part-way is not automatically a rollback

A release is eleven sequential `railway up` calls. If one fails, the job stops
there: the services before it are on the new revision, the rest are on the old
one, and the verification step never runs. The failure summary reports what the
gateway is actually serving so you are not guessing.

**Re-running the failed job is usually the right move, not rolling back.**
`railway up` is idempotent, so a re-run simply finishes the sequence. Reach for
rollback only when the new revision is the problem — not when the deploy was
merely interrupted.

`scripts/ci/railway-up.sh` already retries transport failures three times with
backoff (a Railway API timeout aborted a release this way on 2026-08-07). A
step that fails *after* those retries is either a genuine build failure — the
wrapper says so explicitly and does not retry — or Railway itself is degraded;
check <https://status.railway.com> before re-running.

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

1. **No staging environment.** `develop` deploys nowhere and `main` goes straight
   to production, so every change is first exercised on live traffic. It is also
   why the web app's preview deployments point at the production API and write to
   production data — previews need an API and there is no other one. This is now
   the largest structural gap in the system.

2. **The alert thresholds are barely tested.** Application metrics first reached
   Prometheus on 2026-08-07, so every threshold in `monitoring/alerts.yml` is a
   guess with about a day of evidence behind it. `HighHeapUsage` was already
   wrong enough to fire permanently on a healthy fleet. Expect others to be, and
   re-tune after a week of real data rather than trusting them.

3. **The container CI builds is not the container that ships.** CI builds all 11
   images, verifies they build, then discards them; Railway rebuilds from source
   on deploy. What was tested and what runs are different artifacts.

---

### Closed on 2026-08-07/08 — recorded because each was believed to be fine

- **Storage had no backups.** Files now live in Cloudflare R2 with a nightly
  append-only copy into a 30-day-locked bucket the application cannot reach.
  Proven end to end: a file deleted from live remained recoverable from backup.
- **Deletes silently did nothing.** `user-service` had no access to the storage
  volume, so every delete was a no-op. Fixed by the move to object storage.
- **The rollback workflow could never have run.** It looked for a second
  `SUCCESS` deployment, but Railway marks superseded deployments `REMOVED`, so
  the target never existed. Fixed, and since exercised for real with
  `apply=true`.
- **Neon retention was unconfirmed.** Measured: 1 day, now reported daily.
- **No restore had ever been performed.** A weekly drill branches production at
  a point in time, verifies schema and row counts against live, reports the
  restore time, and deletes the branch.
- **Off-Neon backups were manual, and were not happening.** Now nightly into the
  locked bucket.
