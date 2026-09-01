# Apsara Talent — API

NestJS microservices platform connecting companies and employees: job matching,
resume building, and real-time chat.

**API Gateway** routes HTTP to six internal services over TCP RPC. Postgres on
Neon, Redis and the services on Railway, uploaded files in Cloudflare R2, and a
Prometheus/Grafana/Alertmanager stack alongside.

## Documentation

| Read this | When |
| --- | --- |
| [Infrastructure map](docs/INFRASTRUCTURE.md) | "where does X live, and what runs when?" |
| [Runbook](docs/RUNBOOK.md) | something is broken — backups, restores, rollbacks |
| [Production rollout](docs/PRODUCTION-ROLLOUT.md) | provisioning the platform from scratch |
| [Storage](docs/STORAGE.md) | anything touching uploaded files |
| [Load testing](docs/load-testing.md) | measuring throughput and latency against thresholds |
| [Monitoring](monitoring/production/README.md) | the production metrics and alerting stack |
| [CLAUDE.md](CLAUDE.md) | architecture, conventions, common tasks |

## Getting started

```bash
npm ci
cp .env.example .env      # then fill it in
npm run start:dev         # or ./scripts/dev/run.sh for all services in tmux
npm test
```
