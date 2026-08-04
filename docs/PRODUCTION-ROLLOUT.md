# Production rollout checklist

The repository is fail-closed: a push to `main` will not deploy if required
provider configuration is missing, tests fail, monitoring configuration is
invalid, a container cannot build, a migration fails, or the final API health
check does not pass.

## 1. GitHub configuration

API repository secrets:

- `DATABASE_URL`: direct production database URL used by migrations.
- `RAILWAY_TOKEN`: token scoped to the production Railway project.

API repository variables:

- `PRODUCTION_API_URL`: public HTTPS origin of `api-gateway`.
- `STAGING_API_URL`: the only origin authorized for manual load tests.

Web repository secrets:

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.
- `SENTRY_AUTH_TOKEN` for source-map upload.

Web repository variables:

- `SENTRY_ORG` and `SENTRY_PROJECT`.

Protect `main`, require the verification workflow, and require review before
merging. The two workflows deploy only from `main`; pull requests build and
test without changing production.

## 2. Railway application services

Create the seven services named exactly as CI expects:

- `api-gateway`, `auth-service`, `user-service`,
  `resume-builder-service`, `chat-service`, `job-service`, and
  `notification-service`.

For each service, set the repository root as build context, the Dockerfile path
listed in `railway.toml`, and the config file path to
`railway/api-service.toml`. Give only `api-gateway` a public domain.

Copy the required production values from `.env.example` into Railway. In
particular:

- Use private `*.railway.internal` addresses between services.
- Set `PORT=9101`, `9102`, `9103`, `9104`, `9105`, and `9107` on the six
  internal services respectively; their existing RPC ports remain unchanged.
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
ports, volumes, secrets, and health checks. Alertmanager deliberately refuses
to start without `ALERTMANAGER_SLACK_WEBHOOK_URL`; Grafana deliberately refuses
weak or absent administrator credentials.

After the first deployment:

1. Confirm all seven API scrape targets and the web/API blackbox probes are
   `UP` in Prometheus.
2. Confirm the provisioned Apsara Talent dashboard loads in Grafana.
3. Stop one non-production target and verify Slack receives the firing and
   resolved notifications.
4. Keep Prometheus, Alertmanager, and blackbox private. Expose Grafana only if
   its login is protected by HTTPS and a strong password.

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
