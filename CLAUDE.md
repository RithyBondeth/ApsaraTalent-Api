# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Apsara Talent is a NestJS **monorepo**: one HTTP API gateway plus six internal
microservices that communicate over TCP. The platform connects companies and
employees through job matching, resume building, and real-time chat.

## Repository Layout

```
apps/          one folder per deployable service (see table below)
libs/common    cross-cutting runtime code: database, storage, redis, jwt, guards, utils
libs/contracts DTOs, service interfaces, and constants shared across services
migrations/    TypeORM migrations (the only way schema changes reach production)
scripts/       ci/, db/, storage/, dev/, load/ — operational tooling
monitoring/    Prometheus, Grafana, Alertmanager configuration
docs/          INFRASTRUCTURE, RUNBOOK, STORAGE, PRODUCTION-ROLLOUT, load-testing
test/e2e/      end-to-end suite with its own docker-compose infrastructure
```

Only `@app/common` and `@app/contracts` exist as path aliases. There is no
`@app/utils` — shared helper functions live in `libs/common/src/utils/`.

### Services and ports

| Service | Path | Port | Role |
| --- | --- | --- | --- |
| API Gateway | `apps/api-gateway` | 3000 | The only HTTP surface; proxies to the TCP services |
| Auth | `apps/auth-service` | 3001 | Registration, login, 2FA, password recovery, social login |
| User | `apps/user-service` | 3002 | Employee and company profiles, moderation, support |
| Resume Builder | `apps/resume-builder-service` | 3003 | Resume/cover-letter generation and templates |
| Chat | `apps/chat-service` | 3004 | Message persistence |
| Job | `apps/job-service` | 3005 | Job postings, applications, interviews, matching |
| Notification | `apps/notification-service` | 3007 | Notifications and push delivery |

## Service Layout Convention

**Group by feature, not by layer.** Every service's `src/` contains feature
folders plus `health/`, `main.ts`, and the service module:

```
apps/job-service/src/
  jobs/         controllers/  services/
  applications/ controllers/  services/
  interviews/   controllers/  services/
  matching/     controllers/  services/
  health/
  job-service.module.ts
  main.ts
```

Within a feature, split into `controllers/`, `services/`, `gateways/`, `utils/`,
or `config/` once there is more than a file or two of a kind; a small feature can
keep them flat (see `api-gateway/src/ai/` and `api-gateway/src/socket/`).

Do **not** create top-level `src/controllers/` or `src/services/` folders — that
is the layer-first shape this repo deliberately moved away from.

Specs live next to the code they test. A spec that genuinely spans features
(e.g. asserting every RPC controller delegates correctly) belongs at the service
root, such as `apps/job-service/src/rpc-controllers.spec.ts`.

DTOs and interfaces do **not** live inside services — they belong in
`libs/contracts` so both the gateway and the owning service share one definition.

## Development Commands

```bash
npm run start:dev              # gateway in watch mode (alias of start:dev:api)
npm run start:dev:auth         # any one service: :api :auth :users :resume :chat :job :notification
./scripts/dev/run-dev.sh       # every service, each in its own tmux window (needs zsh + tmux)
```

`run-dev.sh` uses one `apsara-backend` tmux session — `tmux attach -t apsara-backend`
to reattach, `Ctrl-b w` to switch windows. Re-running it restarts the whole session.

```bash
npm run build                  # gateway only
npm run build:all              # all seven services
npm run start:prod             # build, then run the gateway compiled
```

### Quality gates

```bash
npm run lint                   # eslint --fix
npm run lint:check             # no writes — what CI runs
npm run typecheck              # tsc --noEmit
npm run typecheck:strict       # strict-null ratchet; the baseline may only shrink
npm run test                   # unit tests
npm run test:cov               # with coverage (thresholds are enforced)
npm run test:e2e               # end-to-end
npm run security:audit         # fails on high/critical production advisories
```

Coverage thresholds are enforced in `package.json` (branches 78 / functions 82 /
lines 89 / statements 88). New code is expected to keep them met.

### Database

```bash
npm run migration:create ./migrations/<Name>
npm run migration:run
npm run migration:show
npm run db:rehearse            # replay migrations against a production-like copy
```

Schema changes reach production **only** through a migration in `migrations/`.
`DATABASE_SYNCHRONIZE` must never be enabled against production.

## Environment Configuration

Environment variables load from the **repository root**, in this order:
`.env.${NODE_ENV}` then `.env` (see `libs/common/src/config/config.module.ts`).
`.env.example` documents every supported variable, and `npm run check:env`
validates a file against the Joi schema in `libs/common/src/config/validation.schema.ts`.

Never commit a real `.env` — CI actively rejects committed environment files and
credential-shaped literals.

## File Storage

Uploads go through a storage driver chosen by `STORAGE_DRIVER`:

- `local` (default) — writes to `./storage`, for development only; ephemeral in containers.
- `s3` — any S3-compatible bucket; **this is what production uses**.

See `docs/STORAGE.md` before touching upload code, and note that the gateway is
the only image that mounts the storage volume.

## Architecture Notes

### Communication
- Gateway exposes HTTP/WebSocket; internal services are TCP microservices.
- Service discovery is environment-variable based (`services.<name>.host` / `.port`).
- Real-time chat and calls use Socket.IO, in `api-gateway/src/chat/gateways/`.

### Error handling
- Inside a microservice, throw `RpcException`.
- The gateway converts those to HTTP via `api-gateway/src/utils/rpc-to-http-exception.filter.ts`.
- Never let a raw driver or ORM error escape to the client.

### Shared library imports
```typescript
import { DatabaseModule } from '@app/common/database/database.module';
import { JwtModule } from '@app/common/jwt/jwt.module';
import { AuthGuard } from '@app/common/guards/auth.guard';
```

Note: `libs/common` and `libs/contracts` currently import from each other. Avoid
deepening that cycle — prefer putting genuinely shared, dependency-free helpers
in `libs/common/src/utils/`.

### Database entities
PostgreSQL via TypeORM, with pgvector for embedding search. Core entities: `User`
(role-based: Employee or Company), `Employee`, `Company`, `Job`, `Application`,
`Interview`, `JobMatching`, `CareerScope`, `ResumeTemplate`, and the chat entities.

## Deployment

Deploys run on Railway from `main` only, via `.github/workflows/deploy.yml`.
Each service has its own Dockerfile that runs `npm ci` → `nest build` → 
`npm prune --omit=dev`, so devDependencies never ship in the runtime image.

**Deploying all seven services at once takes production down for roughly 80
seconds.** Prefer deploying only the services a change actually touches.

`docs/RUNBOOK.md` covers rollback, and `scripts/ci/railway-rollback.mjs` automates it.

## Working In This Repo

1. Run `npm run lint:check` and `npm run typecheck` before committing.
2. Put shared types in `libs/contracts`, not in a service.
3. Follow the feature-first layout above when adding files.
4. Add a migration for every schema change; never rely on synchronize.
5. Import `Logger`/`PinoLogger` from `nestjs-pino` for consistent structured logs.
6. Keep secrets in environment variables — CI will reject hard-coded credentials.
