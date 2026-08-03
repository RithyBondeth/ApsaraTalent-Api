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
- Set `ALERTMANAGER_SLACK_WEBHOOK_URL` on Alertmanager. The container refuses to
  start without a real notification destination.
- Set `GF_SECURITY_ADMIN_USER`, `GF_SECURITY_ADMIN_PASSWORD`,
  `GF_USERS_ALLOW_SIGN_UP=false`, `GF_AUTH_ANONYMOUS_ENABLED=false`, and
  `PROMETHEUS_URL=http://prometheus.railway.internal:9090` on Grafana.
- Set fixed `PORT` values: Prometheus `9090`, Alertmanager `9093`, blackbox
  exporter `9115`, and Grafana `3000`.
- Add persistent Railway volumes at `/prometheus`, `/alertmanager`, and
  `/var/lib/grafana` respectively.
- Do not create public domains for Prometheus, Alertmanager, or blackbox. If a
  Grafana domain is required, protect it with TLS and strong authentication.
- On each internal API service, set `PORT` to its metrics/health HTTP port:
  `9101`, `9102`, `9103`, `9104`, `9105`, and `9107`. Keep the existing RPC
  ports `3001`, `3002`, `3003`, `3004`, `3005`, and `3007` unchanged.
- Set each API service's Railway config file path to
  `railway/api-service.toml`. The checked-in config files provide the correct
  health path, rollout overlap, and graceful shutdown window for each service.

After rollout, confirm every target is `UP`, deliberately stop a non-production
service, and verify that the Slack alert fires and later resolves.
