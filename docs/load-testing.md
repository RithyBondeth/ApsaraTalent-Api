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

**The thresholds are a starting point, not a calibrated gate.** `LOAD_MAX_P95_MS`
is 2000ms, which catches a hot path that has gone seconds slow or that errors
under concurrency — it will not catch a regression from 50ms to 150ms. After the
first green run, take the p95 the harness prints and set the threshold to
roughly 3x it, then tighten as the number settles. Every value is overridable
from the workflow, so calibrating is a one-line change.

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
