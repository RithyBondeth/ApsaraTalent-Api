# Load testing

The API includes a small dependency-free load harness for health checks and
read-only API routes. It measures throughput, error rate, and p50/p95/max
latency, then exits unsuccessfully when a configured threshold is exceeded.

Validate the configuration without sending requests:

```bash
npm run test:load:check
```

## In CI

Every push and pull request runs a load phase inside the end-to-end run, against
the same isolated stack the e2e specs use — the gateway on `127.0.0.1:13000`,
backed by the throwaway Postgres and Redis on 15432/16379. It runs there because
that is the only point at which the stack is already standing; a separate job
would have to build all of it again to measure the same thing.

It probes `/health/ready` rather than `/health`, because readiness touches the
database and Redis and so measures the path a real request depends on. A
liveness handler returns a constant and would stay fast no matter what
regressed.

Run it locally the same way CI does:

```bash
E2E_LOAD=1 npm run test:e2e
```

`LOAD_MAX_P95_MS` is **500ms**, calibrated from three consecutive hosted-runner
releases rather than guessed:

| run | p95 | errors |
| --- | --- | --- |
| 1 | 111.0ms | 0.37% |
| 2 | 169.1ms | 0.26% |
| 3 | 110.4ms | 0 |

500ms is roughly 3x the worst of those. The spread between 110ms and 169ms under
identical conditions is why the multiple is 3x and not 1.5x — a shared runner
varies by half again on its own.

**Concurrency is 5, and that is deliberate.** `/health/ready` pings the database,
Redis *and* all six internal services over TCP, so every request fans out to
eight dependencies. It ran at concurrency 20 for five releases, which was ~2,300
backend operations per second, and the internal pings intermittently timed out:

| run | error rate |
| --- | --- |
| 1 | 0.37% |
| 2 | 0.26% |
| 3 | 0% |
| 4 | 0.26% |
| 5 | **3.3%** — failed the release |

The 1% tolerance sits inside that spread, so run 5 failed a release for runner
contention rather than for anything in the code. Concurrency 5 keeps the real
dependency fan-out in the measurement — the reason this endpoint was chosen —
while staying off the saturation cliff. Nothing in production probes readiness
more than every 15-30 seconds, so 20 was never a realistic shape of load.

The 1% error tolerance stays a real gate. At this concurrency a 503 should mean
readiness is genuinely broken.

Do not tighten past what a shared runner can hold. A flaky gate is worse than no
gate: people rerun it until it passes, and learn to ignore the one signal it
exists to give.

Run the default local health test:

```bash
npm run test:load
```

Exercise several safe local routes:

```bash
LOAD_BASE_URL=http://127.0.0.1:3000 \
LOAD_PATHS=/health,/metrics \
LOAD_CONCURRENCY=20 \
LOAD_DURATION_SECONDS=30 \
npm run test:load
```

Important environment variables:

- `LOAD_BASE_URL`: target origin; defaults to `http://127.0.0.1:3000`.
- `LOAD_PATHS`: comma-separated read-only paths; defaults to `/health`.
- `LOAD_CONCURRENCY`: parallel workers, from 1 to 250.
- `LOAD_DURATION_SECONDS`: test duration, from 1 to 900 seconds.
- `LOAD_MAX_ERROR_RATE`: accepted failure ratio; defaults to `0.01`.
- `LOAD_MAX_P95_MS`: maximum p95 latency; defaults to `1000`.
- `LOAD_MIN_RPS`: minimum aggregate requests per second; defaults to `1`.
- `LOAD_EXPECTED_STATUSES`: accepted HTTP statuses; defaults to `200`.
- `LOAD_AUTHORIZATION` and `LOAD_COOKIE`: optional credentials for the target.

Remote targets are refused unless `LOAD_ALLOW_REMOTE=1` is set. Only run
against infrastructure you own or have explicit authorization to test. Prefer
a manually triggered workflow, which can be protected with GitHub
environment approvals and stores the result as an artifact.

Start with a small concurrency and short duration. Observe database, Redis,
service, and error metrics during the test before increasing traffic. Never
point this harness at production during peak usage.
