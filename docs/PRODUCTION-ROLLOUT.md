# Production rollout checklist

The repository is fail-closed: a push to `main` will not deploy if required
provider configuration is missing, tests fail, monitoring configuration is
invalid, a container cannot build, a migration fails, or the final API health
check does not pass.

## 1. GitHub configuration

API repository secrets:

- `DATABASE_URL`: direct production database URL used by migrations.
- `RAILWAY_TOKEN`: token scoped to the production Railway project. Also used by
  the rollback workflow.
- `NEON_API_KEY`: Neon API key with write access to the production project.
  Used only to create the pre-migration restore point.
- `NEON_PROJECT_ID`: the Neon project the restore point is taken in.

Both are set by hand, independent of Neon's GitHub App. The App being installed
on this repository grants access but provisions nothing — these two secrets are
the only thing the release reads.

Create the key at Neon Console → Account settings → API keys, and read the
project id from Neon Console → project → Settings → General (it looks like
`winter-frost-12345678`, and is *not* the `ep-...` endpoint id in
`DATABASE_URL`). Prefer a project-scoped key if your account offers one; the
release only ever lists, creates, and deletes branches in this one project.

Verify both before the first release — this is read-only and creates nothing:

```bash
curl -s -H "Authorization: Bearer $NEON_API_KEY" \
  "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches" | head -c 400
```

A JSON object with a `branches` array means both values are correct. `401`/`403`
is a bad key or one without access to the project; `404` is a wrong project id.

`release-preflight` fails the release if any of these are missing, before a
single migration runs.

API repository variables:

- `PRODUCTION_API_URL`: public HTTPS origin of `api-gateway`.

Web repository secrets:

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. These are now
  load-bearing: production is deployed by the `deploy` job in
  `.github/workflows/deploy.yml`, not by Vercel's Git integration.
- `SENTRY_AUTH_TOKEN` for source-map upload.
- `VERCEL_AUTOMATION_BYPASS_SECRET` when Deployment Protection is enabled, so
  the health verifier can reach a protected deployment.

Web repository variables:

- `SENTRY_ORG` and `SENTRY_PROJECT`.
- `PRODUCTION_WEB_URL`: the public site origin. Optional but recommended — when
  set, the deploy verifies the production alias and not only the fresh
  deployment URL.

Protect `main`, require the verification workflow, and require review before
merging. The two workflows deploy only from `main`; pull requests build and
test without changing production.

> **Vercel: automatic production deploys must stay off.** `vercel.json` sets
> `git.deploymentEnabled.main = false`. This is what makes the web checks a real
> gate — without it Vercel builds and promotes every push to `main` regardless of
> whether CI passed. If someone re-enables it in the Vercel dashboard, the gate
> is gone and nothing in this repository will report that. Preview deploys on
> other branches are unaffected.

## 2. Railway application services

Create seven services whose Railway **display names** are exactly:

- `API Gateway`, `Auth Service`, `User Service`, `Resume Builder Service`,
  `Chat Service`, `Job Service`, and `Notification Service`.

These strings are matched verbatim by `railway up --service "..."` in
`.github/workflows/deploy.yml` and by the choice list in
`.github/workflows/rollback.yml`. A rename breaks the release, and it breaks it
mid-deploy — after some services have already switched over.

**Do not assume the private hostname matches the display name.** Railway sets
each service's `RAILWAY_PRIVATE_DOMAIN` independently, and in this project the
gateway's is `apsaratalent-api.railway.internal` — *not* `api-gateway`, which
does not resolve at all. The six internal services do happen to match their
slugified names, which is exactly what made the gateway's mismatch easy to miss.

Read the real value rather than inferring it:

```bash
railway variables --service "API Gateway" --json | grep RAILWAY_PRIVATE_DOMAIN
```

Any hostname in `monitoring/production/prometheus/prometheus.yml` or in a
Dockerfile default must match that output exactly.

The four monitoring services are lowercase — `prometheus`, `alertmanager`,
`blackbox-exporter`, `grafana` — and CI targets them in that form.

For each service, set the repository root as build context, the Dockerfile path
listed in `railway.toml`, and the config file path to
`railway/api-service.toml`. Give only `api-gateway` a public domain.

Copy the required production values from `.env.example` into Railway. In
particular:

- Use private `*.railway.internal` addresses between services.
- **Do not set `PORT` on the six internal services.** Railway injects
  `PORT=8080` and `main.ts` resolves its HTTP port as
  `Number(process.env.PORT) || metricsPort`, so the platform's value wins
  regardless. The images pin `ENV PORT=8080` to match, and
  `monitoring/production/prometheus/prometheus.yml` scrapes `:8080`.
  Setting `PORT` per service here would break the Prometheus targets.
  Their RPC ports (3001–3007) are separate and remain unchanged.
- Generate one random `METRICS_TOKEN` of at least 32 characters and set it on
  all seven API services and Prometheus.
- Set `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production`, and a distinct
  `SENTRY_SERVICE` on every service.
- Enable S3-compatible storage following `docs/STORAGE.md`; do not treat the
  Railway volume as a durable backup.

The gateway's `/health/live` proves the process is running. `/health/ready`
proves every downstream service is reachable. CI checks both after release.

## 3. Prometheus, Alertmanager, blackbox, and Grafana

Create four more private Railway services named exactly:

- `prometheus`, `alertmanager`, `blackbox-exporter`, and `grafana`.

Follow `monitoring/production/README.md` for Dockerfile paths, config paths,
ports, volumes, secrets, and health checks. Alertmanager deliberately refuses to
start without `ALERTMANAGER_TELEGRAM_BOT_TOKEN` and
`ALERTMANAGER_TELEGRAM_CHAT_ID`; Grafana deliberately refuses weak or absent
administrator credentials.

After the first deployment:

1. Confirm all seven API scrape targets and the web/API blackbox probes are
   `UP` in Prometheus.
2. Confirm the provisioned Apsara Talent dashboard loads in Grafana.
3. Stop one non-production target and verify Telegram receives the firing and
   resolved notifications.
4. Keep Prometheus, Alertmanager, and blackbox private. Expose Grafana only if
   its login is protected by HTTPS and a strong password.
5. Configure `WATCHDOG_HEARTBEAT_URL` and prove the dead-man's switch by
   stopping Alertmanager and confirming the external provider pages you. This
   whole stack runs inside the same Railway project as the services it watches,
   so it is the only alert path that survives losing the project.

## 4. Web and Sentry

In Vercel, configure at least:

- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`,
  `SENTRY_ENVIRONMENT=production`, and an appropriate traces sample rate.
- Any existing public Firebase, OAuth, maps, notification, or payment values
  required by `npm run check:env`.

Confirm the canonical production domain resolves to Vercel and `/health`
returns `status=ok`, `api=configured`, and the deployed commit as `release`.

In Sentry, configure alerts for both the web project and all API service
projects. At minimum alert on new regressions, unhandled errors, elevated error
rate, and performance degradation. Add external uptime checks for:

- `https://<web-domain>/health`
- `https://<api-domain>/health/live`
- `https://<api-domain>/health/ready`

Route Sentry alerts to a destination that is actively monitored. The SDKs now
scrub credentials and cookies before sending events, and a trace sample rate of
`0` is respected.

## 5. Database, backup, and release proof

Before the first release, confirm Neon point-in-time retention and perform the
restore drill in `docs/RUNBOOK.md`. Migrations run before application deploys,
so take a verified backup before any destructive schema change.

Open a pull request into `main`, wait for every required check, then merge.
After deployment, record:

- the web and API release SHAs;
- the successful GitHub workflow URLs;
- API live/ready responses;
- Prometheus target status and one delivered test alert;
- a Sentry test event from web and API;
- an authenticated upload/download check against object storage.
