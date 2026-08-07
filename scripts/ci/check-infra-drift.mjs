/**
 * Asserts that production infrastructure still matches documented policy.
 *
 * This exists because policy that lives only in a Markdown file is not enforced
 * by anything. `monitoring/production/README.md` has always said to keep
 * Prometheus, Alertmanager and blackbox private — and on 2026-08-07 all three
 * were found serving publicly with no authentication: the Alertmanager silences
 * API was writable by anyone, and blackbox `/probe` was an open SSRF pivot into
 * the Railway private network. Nothing in CI could have noticed, because every
 * one of those settings is made by hand in the Railway dashboard.
 *
 *   node scripts/ci/check-infra-drift.mjs
 *
 * Read-only. Requires RAILWAY_TOKEN scoped to the production project.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Services that must never be reachable from the internet. Prometheus reaches
// blackbox and every application service over *.railway.internal, and only
// Prometheus talks to Alertmanager — so none of these needs a public domain.
const MUST_BE_PRIVATE = ['prometheus', 'alertmanager', 'blackbox-exporter'];

// Grafana is deliberately public: it is the one UI a human needs, and it gates
// on GF_SECURITY_ADMIN_PASSWORD with anonymous access disabled. Asserting it
// stays public also catches the opposite mistake — losing the only way in.
const MUST_BE_PUBLIC = ['grafana'];

// Every service that serves /metrics, plus Prometheus which scrapes them.
// METRICS_TOKEN must be present AND identical across all of them:
//   - missing on a service  -> metrics.controller.ts returns 404 in production
//                              (deliberate: it hides the endpoint), so the
//                              target reports down and no application-level
//                              alert can ever fire
//   - mismatched            -> 401, same outcome, different status code
// Found unset on all seven services on 2026-08-07 while Prometheus had it, which
// is why every application metric had been missing since the stack was built.
const METRICS_SERVICES = [
  'API Gateway',
  'Auth Service',
  'User Service',
  'Resume Builder Service',
  'Chat Service',
  'Job Service',
  'Notification Service',
];

function readVariables(service) {
  const result = spawnSync(
    'railway',
    ['variables', '--service', service, '--json'],
    { encoding: 'utf8', timeout: 60_000 },
  );
  if (result.status !== 0) {
    throw new Error(
      `railway variables failed for "${service}": ${result.stderr?.trim() || result.error?.message || 'unknown error'}`,
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`railway returned non-JSON for "${service}"`);
  }
}

function publicDomain(service) {
  return (readVariables(service).RAILWAY_PUBLIC_DOMAIN || '').trim();
}

const failures = [];
const notes = [];

for (const service of MUST_BE_PRIVATE) {
  const domain = publicDomain(service);
  if (domain) {
    failures.push(
      `${service} is exposed at https://${domain} — it must have no public domain. ` +
        `Remove it: railway domain delete ${domain} --service ${service}`,
    );
  } else {
    notes.push(`${service}: private`);
  }
}

for (const service of MUST_BE_PUBLIC) {
  const domain = publicDomain(service);
  if (!domain) {
    failures.push(
      `${service} has no public domain — it is the only human entry point to the metrics stack.`,
    );
  } else {
    notes.push(`${service}: public (expected)`);
  }
}

// Token values are compared, never printed. A fingerprint is enough to tell
// "these differ" without putting the secret in a build log.
const fingerprint = (value) =>
  createHash('sha256').update(value).digest('hex').slice(0, 8);

const prometheusToken = (readVariables('prometheus').METRICS_TOKEN || '').trim();
if (!prometheusToken) {
  failures.push(
    'prometheus is missing METRICS_TOKEN — it cannot authenticate to any /metrics endpoint.',
  );
}

const missingToken = [];
const mismatchedToken = [];
for (const service of METRICS_SERVICES) {
  const token = (readVariables(service).METRICS_TOKEN || '').trim();
  if (!token) missingToken.push(service);
  else if (prometheusToken && token !== prometheusToken)
    mismatchedToken.push(service);
}

if (missingToken.length) {
  failures.push(
    `METRICS_TOKEN is not set on: ${missingToken.join(', ')}. ` +
      `In production /metrics returns 404 without it, so these targets report down ` +
      `and no application-level alert can fire. Copy the value from the prometheus service.`,
  );
}
if (mismatchedToken.length) {
  failures.push(
    `METRICS_TOKEN does not match Prometheus on: ${mismatchedToken.join(', ')} ` +
      `(prometheus fingerprint ${fingerprint(prometheusToken)}). Scrapes will 401.`,
  );
}
if (!missingToken.length && !mismatchedToken.length && prometheusToken) {
  notes.push(
    `metrics token: present and identical across ${METRICS_SERVICES.length} services (fingerprint ${fingerprint(prometheusToken)})`,
  );
}

// Not a failure: the heartbeat is optional by design, because a missing value
// must never block a release. But an unarmed dead-man's switch should be said
// out loud rather than discovered during an outage.
const watchdog = (
  readVariables('alertmanager').WATCHDOG_HEARTBEAT_URL || ''
).trim();
if (!watchdog) {
  notes.push(
    'alertmanager: WATCHDOG_HEARTBEAT_URL is UNSET — the dead-man’s switch is off',
  );
} else {
  notes.push('alertmanager: dead-man’s switch armed');
}

for (const note of notes) console.log(`  ${note}`);

if (failures.length) {
  console.error('\nInfrastructure has drifted from documented policy:\n');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\nInfrastructure matches documented policy.');
