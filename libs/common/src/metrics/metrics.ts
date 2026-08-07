import { getHeapStatistics } from 'node:v8';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  register,
} from 'prom-client';

// Node/process metrics (event-loop lag, heap, GC, CPU) on the default registry.
// Safe to call once at module load; guarded so repeated imports don't re-register.
let defaultsStarted = false;
if (!defaultsStarted) {
  collectDefaultMetrics({ register });
  defaultsStarted = true;
}

// prom-client ships nodejs_heap_size_used_bytes and nodejs_heap_size_total_bytes
// but NOT the heap limit, which makes heap-pressure alerting impossible to get
// right: `total` is what V8 has grown to so far, not the ceiling, so used/total
// naturally sits at 85-96% on a perfectly healthy process. Alerting on that
// ratio pages constantly and means nothing.
//
// used/limit is the ratio that actually predicts an OOM kill.
export const nodejsHeapSizeLimit = new Gauge({
  name: 'nodejs_heap_size_limit_bytes',
  help: 'Maximum heap size V8 will grow to before an out-of-memory failure.',
  registers: [register],
  collect() {
    this.set(getHeapStatistics().heap_size_limit);
  },
});

// Latency buckets in seconds — spread across the range we care about
// (sub-100ms healthy ... multi-second slow) so Prometheus can compute
// histogram_quantile() for p50/p95/p99.
const LATENCY_BUCKETS = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'End-to-end HTTP request duration at the gateway, in seconds.',
  labelNames: ['method', 'route', 'status_code'],
  buckets: LATENCY_BUCKETS,
  registers: [register],
});

export const rpcHandlerDuration = new Histogram({
  name: 'rpc_handler_duration_seconds',
  help: 'Microservice @MessagePattern handler duration, in seconds.',
  labelNames: ['handler', 'status'],
  buckets: LATENCY_BUCKETS,
  registers: [register],
});

export function observeHttp(
  method: string,
  route: string,
  statusCode: number,
  durationMs: number,
): void {
  httpRequestDuration.observe(
    { method, route, status_code: String(statusCode) },
    durationMs / 1000,
  );
}

export function observeRpc(
  handler: string,
  isError: boolean,
  durationMs: number,
): void {
  rpcHandlerDuration.observe(
    { handler, status: isError ? 'error' : 'ok' },
    durationMs / 1000,
  );
}

/** Prometheus exposition text + content type for the /metrics endpoint. */
export async function getMetrics(): Promise<{
  contentType: string;
  body: string;
}> {
  return { contentType: register.contentType, body: await register.metrics() };
}

/**
 * Authentication attempts, for spotting credential stuffing.
 *
 * Labels are deliberately low-cardinality: NEVER add user id, email, or IP here
 * — Prometheus creates a time series per label combination, and per-user labels
 * would grow unbounded. User-level detail belongs in the login_history table
 * and the Telegram notification, not in metrics.
 */
export const loginAttempts = new Counter({
  name: 'auth_login_attempts_total',
  help: 'Login attempts at the gateway, labelled by outcome.',
  labelNames: ['result'],
  registers: [register],
});
