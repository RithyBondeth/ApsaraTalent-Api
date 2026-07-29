# Load testing

The API includes a small dependency-free load harness for health checks and
read-only API routes. It measures throughput, error rate, and p50/p95/max
latency, then exits unsuccessfully when a configured threshold is exceeded.

Validate the configuration without sending requests:

```bash
npm run test:load:check
```

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
- `LOAD_AUTHORIZATION` and `LOAD_COOKIE`: optional staging credentials.

Remote targets are refused unless `LOAD_ALLOW_REMOTE=1` is set. Only run
against infrastructure you own or have explicit authorization to test. Prefer
the manually triggered staging workflow, which can be protected with GitHub
environment approvals and stores the result as an artifact.

Start with a small concurrency and short duration. Observe database, Redis,
service, and error metrics during the test before increasing traffic. Never
point this harness at production during peak usage.
