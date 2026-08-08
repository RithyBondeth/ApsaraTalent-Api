/**
 * Create a Neon branch as a restore point immediately before production
 * migrations run.
 *
 * Why a branch and not a pg_dump: a branch is created from the current LSN in
 * seconds regardless of database size, no production data crosses the CI
 * runner, and recovery is "point an endpoint at the branch" rather than a
 * restore race during an incident. See docs/RUNBOOK.md §3.
 *
 * This script is the deploy pipeline's safety gate. If it cannot produce a
 * restore point it exits non-zero, and no migration should run behind it.
 *
 * Usage:
 *   NEON_API_KEY=... NEON_PROJECT_ID=... node scripts/ci/create-restore-point.mjs
 *
 * Environment:
 *   NEON_API_KEY              (required) Neon personal or org API key.
 *   NEON_PROJECT_ID           (required) Target Neon project.
 *   NEON_PARENT_BRANCH        Branch to snapshot. Defaults to the project default.
 *   RESTORE_POINT_LABEL       Suffix for the branch name. Defaults to the commit SHA.
 *   RESTORE_POINT_KEEP        How many CI restore points to retain. Default 10.
 *                             Set to 0 to disable pruning entirely.
 *   GITHUB_OUTPUT             When set, the created branch id/name are appended
 *                             so later steps can reference the restore point.
 */

const API_BASE =
  process.env.NEON_API_BASE || 'https://console.neon.tech/api/v2';

// Reserved namespace. Pruning only ever considers branches under this prefix,
// so a human-created branch can never be deleted by this script.
const PREFIX = 'ci-restore-point/';

const apiKey = process.env.NEON_API_KEY?.trim();
const projectId = process.env.NEON_PROJECT_ID?.trim();

if (!apiKey || !projectId) {
  throw new Error(
    'NEON_API_KEY and NEON_PROJECT_ID are both required. A production ' +
      'migration must not run without a restore point — see docs/RUNBOOK.md.',
  );
}

// An unset CI variable arrives as an empty string, which must mean "default",
// not "crash the release".
const keepRaw = process.env.RESTORE_POINT_KEEP?.trim() || '10';
const keep = Number.parseInt(keepRaw, 10);
if (!Number.isInteger(keep) || keep < 0) {
  throw new Error(
    `RESTORE_POINT_KEEP must be a non-negative integer, got "${keepRaw}".`,
  );
}

/**
 * Neon returns 423 Locked while another operation on the project is running,
 * and occasionally 5xx during control-plane deploys. Both are transient and
 * retrying is strictly better than failing a release.
 */
async function neon(path, { method = 'GET', body } = {}) {
  const url = `${API_BASE}/projects/${encodeURIComponent(projectId)}${path}`;
  let lastError = 'no attempt made';

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    let response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          authorization: `Bearer ${apiKey}`,
          accept: 'application/json',
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise((resolve) => setTimeout(resolve, attempt * 3_000));
      continue;
    }

    if (response.ok) {
      return response.status === 204 ? {} : await response.json();
    }

    // Never echo the response body verbatim on auth failures — it can quote the
    // credential back. Status alone is enough to act on.
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Neon rejected the API key (HTTP ${response.status}). Check the ` +
          'NEON_API_KEY secret and that it can access NEON_PROJECT_ID.',
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Neon project "${projectId}" not found (HTTP 404). Check NEON_PROJECT_ID.`,
      );
    }

    const detail = (await response.text()).slice(0, 500);
    lastError = `HTTP ${response.status}: ${detail}`;

    const retryable =
      response.status === 423 ||
      response.status === 429 ||
      response.status >= 500;
    if (!retryable) break;

    await new Promise((resolve) => setTimeout(resolve, attempt * 3_000));
  }

  throw new Error(`Neon ${method} ${path} failed: ${lastError}`);
}

const { branches = [] } = await neon('/branches');

// Neon renamed `primary` to `default`; accept either so this keeps working
// across control-plane versions.
const parentName = process.env.NEON_PARENT_BRANCH?.trim();
const parent = parentName
  ? branches.find((branch) => branch.name === parentName)
  : branches.find(
      (branch) => branch.default === true || branch.primary === true,
    );

if (!parent) {
  throw new Error(
    parentName
      ? `Branch "${parentName}" does not exist in project ${projectId}.`
      : `Could not identify the default branch of project ${projectId}. Set NEON_PARENT_BRANCH explicitly.`,
  );
}

const label = (
  process.env.RESTORE_POINT_LABEL ||
  process.env.GITHUB_SHA ||
  'manual'
).slice(0, 12);
const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\.\d+Z$/, 'Z');
const name = `${PREFIX}${stamp}-${label}`;

console.log(
  `Creating restore point "${name}" from "${parent.name}" (${parent.id})...`,
);

// No `endpoints` — a storage-only branch. Nothing connects to a restore point
// until someone deliberately attaches a compute during recovery, and computes
// are the part that costs money.
const created = await neon('/branches', {
  method: 'POST',
  body: { branch: { name, parent_id: parent.id }, endpoints: [] },
});

const branchId = created?.branch?.id;
if (!branchId) {
  throw new Error(
    `Neon accepted the request but returned no branch id: ${JSON.stringify(created).slice(0, 300)}`,
  );
}

console.log(`Restore point ready: ${name} (${branchId})`);
console.log(
  `Recover with: neon branches restore ${parent.name} ${branchId}  # or use the Neon console`,
);

if (process.env.GITHUB_OUTPUT) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `branch-id=${branchId}\nbranch-name=${name}\n`,
  );
}

// Neon enforces a per-project branch limit. Without pruning, this script would
// eventually fail every deploy — so retention is on by default, and is scoped
// to the reserved prefix and to branches this script created.
if (keep === 0) {
  console.log('Pruning disabled (RESTORE_POINT_KEEP=0).');
  process.exit(0);
}

const { branches: current = [] } = await neon('/branches');
const ours = current
  .filter((branch) => branch.name.startsWith(PREFIX) && branch.id !== branchId)
  .sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

// `keep` counts the restore point we just made, so retain keep-1 older ones.
const stale = ours.slice(Math.max(keep - 1, 0));
if (stale.length === 0) {
  console.log(
    `Retention satisfied: ${ours.length + 1} restore point(s), keeping ${keep}.`,
  );
  process.exit(0);
}

for (const branch of stale) {
  try {
    await neon(`/branches/${encodeURIComponent(branch.id)}`, {
      method: 'DELETE',
    });
    console.log(`Pruned old restore point ${branch.name} (${branch.id})`);
  } catch (error) {
    // A restore point we could not delete is not a reason to block a release.
    // The next run retries, and the branch limit is not yet reached.
    console.warn(
      `Could not prune ${branch.name}: ${error instanceof Error ? error.message : error}`,
    );
  }
}
