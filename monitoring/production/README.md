# Production monitoring on Railway

Create four private services in the same Railway project/environment as the API.
Use the repository root as build context and set these Dockerfile paths:

| Railway service | Dockerfile | Config file |
|---|---|---|
| `prometheus` | `monitoring/production/prometheus/Dockerfile` | `railway/prometheus.toml` |
| `alertmanager` | `monitoring/production/alertmanager/Dockerfile` | `railway/alertmanager.toml` |
| `blackbox-exporter` | `monitoring/production/blackbox/Dockerfile` | `railway/blackbox-exporter.toml` |
| `grafana` | `monitoring/production/grafana/Dockerfile` | `railway/grafana.toml` |

Required configuration:

- Set the same password-manager-generated `METRICS_TOKEN` on Prometheus and all
  seven API services. Use at least 32 random characters.
- Set `PUBLIC_API_HEALTH_URL=https://<api-domain>/health/ready` and
  `WEB_HEALTH_URL=https://<web-domain>/health` on Prometheus. Startup fails if
  either public end-to-end probe is missing.
- Set `ALERTMANAGER_TELEGRAM_BOT_TOKEN` and `ALERTMANAGER_TELEGRAM_CHAT_ID` on
  Alertmanager. The chat ID may be negative for a Telegram group. The container
  refuses to start unless both values are present.
- Set `WATCHDOG_HEARTBEAT_URL` on Alertmanager — see "Dead-man's switch" below.
  Optional, but without it nothing reports this stack failing as a whole.
- Set `GF_SECURITY_ADMIN_USER`, `GF_SECURITY_ADMIN_PASSWORD`,
  `GF_USERS_ALLOW_SIGN_UP=false`, `GF_AUTH_ANONYMOUS_ENABLED=false`, and
  `PROMETHEUS_URL=http://prometheus.railway.internal:9090` on Grafana.
- Set fixed `PORT` values: Prometheus `9090`, Alertmanager `9093`, blackbox
  exporter `9115`, and Grafana `3000`.
- Add persistent Railway volumes at `/prometheus`, `/alertmanager`, and
  `/var/lib/grafana` respectively.
- **Nothing baked into the image may live under a volume mount path.** A Railway
  volume shadows whatever the image placed there. Grafana's dashboards were
  originally copied to `/var/lib/grafana/dashboards` — directly under its volume
  — so they disappeared at runtime and the provisioned dashboard never once
  loaded, while Grafana logged `failed to walk provisioned dashboards` every 30
  seconds. They now live at `/etc/grafana/dashboards`, which is not a mount
  point. The same rule applies to any config added to Prometheus or Alertmanager
  under `/prometheus` or `/alertmanager`.
- Do not create public domains for Prometheus, Alertmanager, or blackbox. If a
  Grafana domain is required, protect it with TLS and strong authentication.
- Leave `PORT` **unset** on the six internal API services. Railway injects
  `PORT=8080`, which always wins over the image's `ENV PORT`, and Prometheus
  scrapes `:8080` accordingly. Setting it per service breaks the scrape
  targets — that is what left all six reporting `connection refused` and every
  application-level alert unable to fire. Their RPC ports (`3001`–`3007`) are
  separate and unchanged. Local development still uses the distinct
  `9101`–`9107` metrics ports; see `monitoring/README.md`.
- Set each API service's Railway config file path to
  `railway/api-service.toml`. The checked-in config files provide the correct
  health path, rollout overlap, and graceful shutdown window for each service.

After rollout, confirm every target is `UP`, deliberately stop a non-production
service, and verify that the Telegram alert fires and later resolves.

## Dead-man's switch

Everything above runs in the same Railway project as the services it watches.
That means a project- or region-level failure takes the monitoring down
*together with* the thing being monitored, and does it silently — Prometheus
cannot alert on its own death, so `MonitoringComponentDown` does not cover this
case. Until the heartbeat below is configured, **silence is indistinguishable
from health.**

The `Watchdog` alert in `monitoring/alerts.yml` fires continuously and forever
by design. Alertmanager forwards it, and only it, to `WATCHDOG_HEARTBEAT_URL`
once a minute. The external service pages when the beat *stops*.

To enable:

1. Create a check on an external provider — healthchecks.io, Better Stack, or
   Grafana Cloud. It must not be hosted on Railway; that would defeat the point.
2. Set the period to 1 minute with a grace of 5 minutes. Alertmanager re-sends
   every minute, so a 5-minute grace tolerates a restart without paging.
3. Set `WATCHDOG_HEARTBEAT_URL` on the Alertmanager service to the ping URL.
4. Redeploy Alertmanager and confirm the provider shows the check as up within
   two minutes.

To verify it actually works, stop the Alertmanager service and confirm the
external provider pages you. That test is the only proof the switch is armed —
and it is the one alert path that cannot be verified from inside Railway.

Leaving `WATCHDOG_HEARTBEAT_URL` unset is supported: the entrypoint strips the
webhook, the `watchdog` receiver becomes a null receiver, and the Watchdog alert
is discarded rather than reaching Telegram every minute. The container logs a
warning at startup so the switch is never off silently.
