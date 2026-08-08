# Infrastructure map

Where everything operational lives, what it does, and when it runs.

This exists instead of an `infrastructure/` directory. Most of these files
cannot move: `.github/workflows/` is fixed by GitHub, and the paths under
`railway/` and `monitoring/production/` are configured **per service in the
Railway dashboard**. Relocating them would mean hand-editing eleven services
with nothing in CI to catch a typo until a deploy failed part-way through a
release — the exact class of drift that caused most of the incidents recorded in
[RUNBOOK.md](./RUNBOOK.md) §7.

So the layout stays where the tools expect it, and this file is the index.

---

## What runs where

| Component | Platform | Public? |
| --- | --- | --- |
| API Gateway + 6 internal services | Railway | gateway only |
| Prometheus, Alertmanager, blackbox, Grafana | Railway | Grafana only |
| Redis | Railway | no |
| Postgres | Neon | no |
| Uploaded files | Cloudflare R2 | public prefixes only |
| Web app | Vercel | yes |

Internal services talk over TCP RPC on `*.railway.internal`. **The gateway's
private hostname is `apsaratalent-api.railway.internal`, not `api-gateway`** —
Railway sets it independently of the display name, and assuming otherwise broke
metrics collection for the lifetime of the project.

---

## Scheduled jobs

Everything that runs unattended, and what its silence means.

| When (UTC) | Workflow | If it fails |
| --- | --- | --- |
| daily 02:00 | `infra-drift.yml` | a hand-made setting has drifted from documented policy |
| daily 17:00 | `db-recovery.yml` (backup) | **no off-Neon copy of the database** |
| daily 18:00 | `storage-backup.yml` | uploaded files have no second copy |
| Sunday 03:00 | `db-recovery.yml` (drill) | the restore path is unproven again |
| Monday 03:00 | `codeql.yml` | scheduled code scan skipped |
| Monday 09:00 | Dependabot | dependency PRs |
| every 60s | `Watchdog` → healthchecks.io | **monitoring itself is down** |

The Watchdog is the one to understand: it fires *continuously* on purpose, and
an external service pages when it **stops**. Silence is the signal.

---

## Workflows

| File | Trigger | Purpose |
| --- | --- | --- |
| `deploy.yml` | push to `main`, PRs | the release: scan → test → build → migrate → deploy → verify |
| `rollback.yml` | manual only | roll Railway services back; dry run by default |
| `infra-drift.yml` | daily | asserts dashboard-only settings still match policy |
| `db-recovery.yml` | nightly + weekly | off-Neon backup, and a real restore drill |
| `storage-backup.yml` | nightly | append-only copy of uploads into the locked bucket |
| `codeql.yml` | push, PR, weekly | static analysis of TypeScript **and** the workflows |

---

## Scripts

### `scripts/ci/` — run by CI

| File | Purpose |
| --- | --- |
| `verify-deployment.mjs` | proves the new release is actually serving (`EXPECTED_RELEASE`) |
| `railway-up.sh` | deploys one service, retrying only transport failures |
| `railway-rollback.mjs` | rollback planner and executor |
| `check-infra-drift.mjs` | the daily drift assertions |
| `create-restore-point.mjs` | Neon branch taken before every migration |
| `db-restore-drill.mjs` | branches production, verifies it, reports restore time |
| `upload-db-backup.mjs` | puts a `pg_dump` into the locked bucket |
| `backup-storage.mjs` | append-only file copy into the locked bucket |
| `check-env.ts` | environment contract |
| `strict-null-ratchet.mjs` | strict-null count may fall, never rise |

### Other

| Path | Purpose |
| --- | --- |
| `scripts/db/` | migrations, seed, `backup-db.sh` |
| `scripts/storage/` | volume→bucket migration, verification, in-container migrator |
| `scripts/load/` | local load test |
| `scripts/dev/run-dev.sh` | all services in tmux |
| `scripts/upload-sourcemaps.mjs` | called from every Dockerfile at build time |

---

## Configuration

| Path | Consumed by |
| --- | --- |
| `railway/*.toml` | Railway — **config path set per service in the dashboard** |
| `monitoring/*.yml` | local Prometheus/Alertmanager via `docker-compose` |
| `monitoring/alerts.yml` | shared by local **and** production |
| `monitoring/production/*/` | the four monitoring images — **Dockerfile path set per service** |
| `apps/*/Dockerfile` | the seven service images |
| `.trivy-gate-ignore` | CVEs that may not block a release, each with an expiry |

**Nothing baked into an image may live under a volume mount path.** A Railway
volume shadows whatever the image put there — which is why Grafana's dashboards
live at `/etc/grafana/dashboards` and not under `/var/lib/grafana`.

---

## Credentials

Names and locations only. Values live in the platform that needs them.

| Secret | Where | Used by |
| --- | --- | --- |
| `RAILWAY_TOKEN` | GitHub | deploy, rollback, drift check |
| `DATABASE_URL` | GitHub + Railway | migrations, backup, drill |
| `NEON_API_KEY`, `NEON_PROJECT_ID` | GitHub | restore points, drill, retention check |
| `S3_*` (app) | Railway | file storage — scoped to the **live** bucket only |
| `S3_BACKUP_*` | GitHub | backups — the app must never hold these |
| `METRICS_TOKEN` | Railway | identical on all 7 services **and** Prometheus |
| `WATCHDOG_HEARTBEAT_URL` | Railway | Alertmanager → external heartbeat |
| `ALERTMANAGER_TELEGRAM_*` | Railway | alert delivery |

The split between the app's S3 credentials and the backup credentials is
deliberate and load-bearing: a leaked application key must not be able to reach
the backups. That separation, not versioning, is what protects them.

`RAILWAY_TOKEN` is a **project** token. It can deploy but cannot change a
service's *source* — which is why deploying prebuilt images from GHCR failed and
was reverted.

---

## Documents

| File | Read it when |
| --- | --- |
| [RUNBOOK.md](./RUNBOOK.md) | something is broken — backups, restores, rollbacks |
| [PRODUCTION-ROLLOUT.md](./PRODUCTION-ROLLOUT.md) | provisioning or re-provisioning the platform |
| [STORAGE.md](./STORAGE.md) | anything touching uploaded files |
| [load-testing.md](./load-testing.md) | running a load test |
| `monitoring/README.md` | local monitoring stack |
| `monitoring/production/README.md` | production monitoring, including the dead-man's switch |

---

## Verified recovery times

Measured, not estimated. Re-measure rather than trusting these if the data grows.

| Operation | Time | Last verified |
| --- | --- | --- |
| Database restore (Neon PITR branch) | **3.7s** | 2026-08-08, automated weekly |
| Neon point-in-time window | **1 day** | checked daily by the drift job |
| Full release | ~40 min | every deploy |
| Rollback (one service) | ~2 min | 2026-08-08 |

A one-day PITR window is short: anything noticed more than 24 hours late is
recoverable only from the nightly off-Neon dump.
