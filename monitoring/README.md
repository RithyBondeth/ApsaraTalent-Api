# Monitoring (Prometheus + Grafana)

Scrapes the `/metrics` endpoints exposed by the gateway and every microservice
(hybrid apps) and visualizes latency, throughput, and errors.

## Run

```bash
# from the repo root
docker compose -f monitoring/docker-compose.yml up -d
```

- **Grafana:** http://localhost:3030 (login `admin` / `admin`, change on first login)
  The "ApsaraTalent API — Performance" dashboard is auto-provisioned.
- **Prometheus:** http://localhost:9090 (check Status → Targets are all `UP`).

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
| payment-service | `:9106` |
| notification-service | `:9107` |

Metrics ports come from `services.<svc>.metricsPort` in
`libs/common/src/config/configuration.ts` (override per service with
`<SVC>_SERVICE_METRICS_PORT`). The API must be running on the host for targets
to come up.

## Securing the endpoints

Set `METRICS_TOKEN` in the API's environment to require a bearer token, then
uncomment the `authorization` block in `prometheus.yml` and set `credentials`
to the same value.

## Handy PromQL

```promql
# p95 latency per route (gateway)
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))

# slowest service RPC handlers (p95)
histogram_quantile(0.95, sum(rate(rpc_handler_duration_seconds_bucket[5m])) by (le, service, handler))

# 5xx rate per route
sum(rate(http_request_duration_seconds_count{status_code=~"5.."}[5m])) by (route)
```

## Notes

- `extra_hosts: host.docker.internal:host-gateway` makes host scraping work on
  Linux (it's automatic on Docker Desktop for macOS/Windows).
- Grafana is on host port **3030** and Prometheus on **9090** to avoid the API's
  own host ports (gateway 3000, services 3001–3007, metrics 9101–9107).
