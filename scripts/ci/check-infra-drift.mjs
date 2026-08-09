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

const prometheusToken = (
  readVariables('prometheus').METRICS_TOKEN || ''
).trim();
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

// Services deliberately deployed from a pre-built image rather than rebuilt by
// Railway, mapped to the image repository each one must be running.
//
// This is dashboard-only state with no representation in the repository, which
// puts it in exactly the category this script exists for. If a source is
// reverted to the git repo — by hand, or by the GitHub integration
// reconnecting — then `redeploy --from-source` starts building from source
// again. The release still goes green, the deploy step still passes, and the
// guarantee that the artifact Trivy scanned is the artifact serving is silently
// gone. Nothing else would ever say so.
//
// Keep in step with the deploy steps in .github/workflows/deploy.yml that call
// railway-deploy-from-source.sh. A service listed here whose step still calls
// railway-up.sh would fail this check, which is the correct direction to be
// wrong in.
const IMAGE_SOURCED = {
  'Notification Service':
    'ghcr.io/rithybondeth/apsaratalent-notification-service',
};

// The services that had a GitHub deployment trigger before 2026-08-09.
// alertmanager, grafana, prometheus and Redis never had one, which is why they
// were the only services deploying once per release.
const TRIGGERLESS_SERVICES = [
  'API Gateway',
  'Auth Service',
  'User Service',
  'Resume Builder Service',
  'Chat Service',
  'Job Service',
  'Notification Service',
  'blackbox-exporter',
];

// Asserts what actually RAN, not what is configured. A configured source that
// has never deployed proves nothing, and the deployment record is the same
// place the rollback path reads from.
function listDeployments(service, limit = 1) {
  const result = spawnSync(
    'railway',
    [
      'deployment',
      'list',
      '--service',
      service,
      '--limit',
      String(limit),
      '--json',
    ],
    { encoding: 'utf8', timeout: 60_000 },
  );
  if (result.status !== 0) {
    throw new Error(
      `railway deployment list failed for "${service}": ${result.stderr?.trim() || result.error?.message || 'unknown error'}`,
    );
  }
  // The CLI intermittently prefixes stdout with an update banner, so take the
  // JSON rather than assuming it is alone. Same hazard as digest-probe.mjs.
  const start = result.stdout.search(/[[{]/);
  if (start === -1) {
    throw new Error(`railway returned no JSON for "${service}"`);
  }
  const parsed = JSON.parse(result.stdout.slice(start));
  return Array.isArray(parsed)
    ? parsed
    : parsed.deployments || parsed.data || [];
}

const latestDeploymentMeta = (service) =>
  listDeployments(service, 1)[0] || null;

for (const [service, expectedRepository] of Object.entries(IMAGE_SOURCED)) {
  const deployment = latestDeploymentMeta(service);
  const image = deployment?.meta?.image;

  if (!deployment) {
    failures.push(
      `${service}: no deployments found — cannot verify its source.`,
    );
  } else if (!image) {
    failures.push(
      `${service} last deployed from SOURCE, not from ${expectedRepository}. ` +
        `Railway rebuilt it, so the image Trivy scanned is not what is running. ` +
        `Set the service source back to the image in the Railway dashboard.`,
    );
  } else if (!image.startsWith(`${expectedRepository}:`)) {
    failures.push(
      `${service} is running ${image}, expected ${expectedRepository}:<tag>.`,
    );
  } else {
    notes.push(
      `${service}: running ${image} (digest ${(deployment.meta.imageDigest || 'unknown').slice(0, 19)}...)`,
    );
  }
}

// Railway's GitHub integration deployed every service on push to main, one
// second after the merge, with checkSuites=false — so production ran new code
// before the tests finished, before the migration rehearsal, and before the
// approval gate. The gate protected the migrations, which only run in CI, but
// not the application code, and nothing said so: every release simply deployed
// twice and the second one overwrote the first.
//
// Eight triggers were deleted on 2026-08-09. CI is now the only path to
// production, matching `git.deploymentEnabled.main: false` on the web side.
//
// Asserted by symptom rather than by configuration. Reading the triggers
// themselves needs `railway api`, and it is unknown whether the project token
// this job runs with may call it — whereas `railway deployment list` is the
// command the deploy path already uses. A git-triggered deployment is
// unmistakable in the record: it carries commitHash, repo and branch, while a
// CI deployment carries none of them.
// Deployments before this are history, not drift: every service legitimately
// has git-triggered deployments from before the triggers were removed, and
// failing on those would make this check permanently red and therefore ignored.
const TRIGGERS_REMOVED_AT = Date.parse('2026-08-09T09:20:00Z');
const GIT_TRIGGER_WINDOW = 10;
const gitTriggered = [];

for (const service of TRIGGERLESS_SERVICES) {
  const recent = listDeployments(service, GIT_TRIGGER_WINDOW);
  const offenders = recent.filter(
    (d) => d?.meta?.commitHash && Date.parse(d.createdAt) > TRIGGERS_REMOVED_AT,
  );
  if (offenders.length) {
    const newest = offenders[0];
    gitTriggered.push(
      `${service} (latest ${newest.createdAt}, commit ${String(newest.meta.commitHash).slice(0, 8)})`,
    );
  }
}

if (gitTriggered.length) {
  failures.push(
    `Railway deployed these services from git, not from CI: ${gitTriggered.join('; ')}. ` +
      `A deployment trigger has been re-added, so production is being deployed on push — ` +
      `before tests, before the migration rehearsal, and before the approval gate. ` +
      `Remove it under the service's Settings > Source in the Railway dashboard.`,
  );
} else {
  notes.push(
    `no git-triggered deployments in the last ${GIT_TRIGGER_WINDOW} per service — CI is the only path to production`,
  );
}

// Neon's point-in-time-recovery window is the whole database recovery story
// between nightly dumps, and RUNBOOK §7 has carried "retention window is
// unconfirmed" as an open item — "PITR you have not checked is not a backup
// strategy". Reporting it on every run is what stops it being unconfirmed, and
// makes a silent plan change visible. Read-only, and optional so this job still
// works with only RAILWAY_TOKEN.
const neonKey = process.env.NEON_API_KEY?.trim();
const neonProject = process.env.NEON_PROJECT_ID?.trim();
if (neonKey && neonProject) {
  try {
    const response = await fetch(
      `https://console.neon.tech/api/v2/projects/${neonProject}`,
      {
        headers: { Authorization: `Bearer ${neonKey}` },
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!response.ok) {
      notes.push(`neon: could not read retention (HTTP ${response.status})`);
    } else {
      const { project } = await response.json();
      const days = project.history_retention_seconds / 86_400;
      notes.push(
        `neon: point-in-time recovery window is ${days.toFixed(1)} days` +
          (days < 1
            ? ' — under 24h, so anything noticed a day late is unrecoverable'
            : ''),
      );
    }
  } catch (error) {
    notes.push(
      `neon: retention check failed (${error instanceof Error ? error.message : error})`,
    );
  }
} else {
  notes.push(
    'neon: retention not checked — NEON_API_KEY/NEON_PROJECT_ID unset',
  );
}

for (const note of notes) console.log(`  ${note}`);

if (failures.length) {
  console.error('\nInfrastructure has drifted from documented policy:\n');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\nInfrastructure matches documented policy.');
