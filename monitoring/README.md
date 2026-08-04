# Monitoring (Prometheus + Grafana)

Scrapes the `/metrics` endpoints exposed by the gateway and every microservice
(hybrid apps) and visualizes latency, throughput, and errors.

## Run

```bash
# from the repo root
cp monitoring/.env.monitoring.example monitoring/.env.monitoring
# Replace the example password with a password-manager-generated value.
docker compose --env-file monitoring/.env.monitoring -f monitoring/docker-compose.yml up -d
```

- **Grafana:** http://localhost:3030 (credentials come from `.env.monitoring`)
  The "ApsaraTalent API — Performance" dashboard is auto-provisioned.
- **Prometheus:** http://localhost:9090 (check Status → Targets are all `UP`; Alerts tab shows rule state).
- **Alertmanager:** http://localhost:9093 (fired alerts land here).

Stop with `docker compose -f monitoring/docker-compose.yml down` (add `-v` to wipe stored metrics).

## Targets

| Process | Scraped at |
|---|---|
| api-gateway | `host.docker.internal:3000/metrics` |
| auth-service | `:9101` |
| user-service | `:9102` |
| resume-builder-service | `:9103` |
| chat-service | `:9104` |
| job-service | `:9105` |
| notification-service | `:9107` |

Metrics ports come from `services.<svc>.metricsPort` in
`libs/common/src/config/configuration.ts` (override per service with
`<SVC>_SERVICE_METRICS_PORT`). The API must be running on the host for targets
to come up.

## Securing the endpoints

Set `METRICS_TOKEN` in the API's environment to require a bearer token, then
configure the corresponding Prometheus `authorization` block. In production,
use `credentials_file` backed by your secret store; never commit the value.

Production fails closed: `/metrics` returns 404 when no token is configured,
and credentials in the query string are rejected. Keep Prometheus on the
Railway private network whenever possible.

## Handy PromQL

```promql
# p95 latency per route (gateway)
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))

# slowest service RPC handlers (p95)
histogram_quantile(0.95, sum(rate(rpc_handler_duration_seconds_bucket[5m])) by (le, service, handler))

# 5xx rate per route
sum(rate(http_request_duration_seconds_count{status_code=~"5.."}[5m])) by (route)
```

## Alerting

Rules live in `alerts.yml` (loaded by Prometheus, state visible at
http://localhost:9090/alerts):

| Alert | Fires when | Severity |
|---|---|---|
| `ServiceDown` | a target is unscrapeable >1m | critical |
| `EndpointUnready` | API or web readiness probe fails >2m | critical |
| `MonitoringComponentDown` | Prometheus, Alertmanager, or blackbox exporter is down >2m | critical |
| `HighHttpP95Latency` | route p95 > 1s for 10m | warning |
| `HighHttp5xxRate` | route 5xx ratio > 5% for 5m | critical |
| `GatewayTimeouts` | any 504s on a route for 5m | critical |
| `HighRpcP95Latency` | a service handler p95 > 1s for 10m | warning |
| `HighEventLoopLag` | a service event-loop p99 > 100ms for 5m | warning |

Routing is handled by **Alertmanager** (`alertmanager.yml`). By default alerts
just collect in its UI. To get notified, uncomment the `slack_configs` block in
`alertmanager.yml` and set your webhook URL (email/PagerDuty/etc. work the same
way). Reload with `docker compose -f monitoring/docker-compose.yml restart alertmanager`.

The repository intentionally does not contain a notification destination. A
production rollout is incomplete until Alertmanager has a real receiver and a
test alert has reached a human.

After editing `alerts.yml`, reload Prometheus:
`curl -X POST http://localhost:9090/-/reload` (or restart the container).

## Notes

- `extra_hosts: host.docker.internal:host-gateway` makes host scraping work on
  Linux (it's automatic on Docker Desktop for macOS/Windows).
- Grafana is on host port **3030** and Prometheus on **9090** to avoid the API's
  own host ports (gateway 3000, services 3001–3007, metrics 9101–9107).
- All monitoring UIs bind to `127.0.0.1`; use an authenticated TLS reverse
  proxy rather than exposing these ports directly.
- Image versions are pinned and Prometheus retains 30 days locally. Production
  still needs persistent storage or remote-write retention.
