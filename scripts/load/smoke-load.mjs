const integer = (name, fallback, minimum, maximum) => {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}`,
    );
  }
  return value;
};

const decimal = (name, fallback, minimum, maximum) => {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}`);
  }
  return value;
};

const baseUrl = new URL(process.env.LOAD_BASE_URL ?? 'http://127.0.0.1:3000');
const paths = (process.env.LOAD_PATHS ?? '/health')
  .split(',')
  .map((path) => path.trim())
  .filter(Boolean);
const concurrency = integer('LOAD_CONCURRENCY', 10, 1, 250);
const durationSeconds = integer('LOAD_DURATION_SECONDS', 10, 1, 900);
const timeoutMs = integer('LOAD_REQUEST_TIMEOUT_MS', 5_000, 100, 60_000);
const maxErrorRate = decimal('LOAD_MAX_ERROR_RATE', 0.01, 0, 1);
const maxP95Ms = integer('LOAD_MAX_P95_MS', 1_000, 1, 120_000);
const minRequestsPerSecond = decimal('LOAD_MIN_RPS', 1, 0, 100_000);
const expectedStatuses = new Set(
  (process.env.LOAD_EXPECTED_STATUSES ?? '200')
    .split(',')
    .map((status) => Number.parseInt(status.trim(), 10))
    .filter(Number.isInteger),
);

if (paths.length === 0 || paths.some((path) => !path.startsWith('/'))) {
  throw new Error('LOAD_PATHS must contain one or more absolute URL paths');
}
if (expectedStatuses.size === 0) {
  throw new Error('LOAD_EXPECTED_STATUSES must contain at least one status');
}

const isLocalTarget = ['localhost', '127.0.0.1', '::1'].includes(
  baseUrl.hostname,
);
if (!isLocalTarget && process.env.LOAD_ALLOW_REMOTE !== '1') {
  throw new Error(
    'Remote load testing is disabled. Set LOAD_ALLOW_REMOTE=1 only for an authorized staging target.',
  );
}

const configSummary = {
  target: baseUrl.origin,
  paths,
  concurrency,
  durationSeconds,
  timeoutMs,
  thresholds: {
    maxErrorRate,
    maxP95Ms,
    minRequestsPerSecond,
  },
};

if (process.env.LOAD_DRY_RUN === '1') {
  process.stdout.write(`${JSON.stringify(configSummary, null, 2)}\n`);
  process.exit(0);
}

const authorization = process.env.LOAD_AUTHORIZATION;
const cookie = process.env.LOAD_COOKIE;
const headers = {
  accept: 'application/json',
  ...(authorization ? { authorization } : {}),
  ...(cookie ? { cookie } : {}),
};
const deadline = performance.now() + durationSeconds * 1_000;
const durations = [];
const failures = [];
let completed = 0;
let pathIndex = 0;

async function worker() {
  while (performance.now() < deadline) {
    const path = paths[pathIndex++ % paths.length];
    const startedAt = performance.now();
    try {
      const response = await fetch(new URL(path, baseUrl), {
        headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      });
      const elapsed = performance.now() - startedAt;
      durations.push(elapsed);
      completed += 1;
      await response.body?.cancel();
      if (!expectedStatuses.has(response.status)) {
        failures.push(`${path}: unexpected HTTP ${response.status}`);
      }
    } catch (error) {
      durations.push(performance.now() - startedAt);
      completed += 1;
      failures.push(
        `${path}: ${error instanceof Error ? error.message : 'request failed'}`,
      );
      // Avoid a tight retry loop when the target is unavailable.
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

const runStartedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const elapsedSeconds = (performance.now() - runStartedAt) / 1_000;
durations.sort((left, right) => left - right);
const percentile = (fraction) =>
  durations.length === 0
    ? 0
    : durations[
        Math.min(
          durations.length - 1,
          Math.ceil(durations.length * fraction) - 1,
        )
      ];
const errorRate = completed === 0 ? 1 : failures.length / completed;
const requestsPerSecond = completed / elapsedSeconds;
const result = {
  ...configSummary,
  completed,
  failed: failures.length,
  errorRate: Number(errorRate.toFixed(4)),
  requestsPerSecond: Number(requestsPerSecond.toFixed(2)),
  latencyMs: {
    p50: Number(percentile(0.5).toFixed(1)),
    p95: Number(percentile(0.95).toFixed(1)),
    max: Number((durations.at(-1) ?? 0).toFixed(1)),
  },
  sampleFailures: failures.slice(0, 5),
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

const violations = [];
if (errorRate > maxErrorRate) {
  violations.push(`error rate ${result.errorRate} exceeded ${maxErrorRate}`);
}
if (result.latencyMs.p95 > maxP95Ms) {
  violations.push(`p95 ${result.latencyMs.p95}ms exceeded ${maxP95Ms}ms`);
}
if (requestsPerSecond < minRequestsPerSecond) {
  violations.push(
    `throughput ${result.requestsPerSecond} rps was below ${minRequestsPerSecond} rps`,
  );
}
if (violations.length > 0) {
  throw new Error(`Load thresholds failed: ${violations.join('; ')}`);
}
