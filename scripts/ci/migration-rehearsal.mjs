/**
 * Rehearse this release's migrations against real production data, before they
 * touch production.
 *
 * Nothing in the pipeline currently answers "will this migration apply to the
 * rows that are actually in the database?". `migrations.spec.ts` calls `up()`
 * and `down()` against a mocked QueryRunner, which proves the SQL strings exist
 * and are non-empty — it never executes them, so it cannot see a NOT NULL added
 * to a column containing nulls, a UNIQUE index over existing duplicates, a type
 * narrowing that overflows, or a backfill that deadlocks against live-shaped
 * data. Those only appear on real rows, and today they would appear for the
 * first time in the `migrate` job, against production, behind a Neon restore
 * point whose point-in-time window is 1 day.
 *
 * `migration:revert` is in the same position, and worse: it has never been
 * executed at all. It is the documented first move in RUNBOOK §5, and on
 * 2026-08-07 every safety mechanism in this system that had never been
 * exercised turned out to be broken.
 *
 * So this rehearses the whole sequence on a copy-on-write branch:
 *
 *   1. branch production at its current state (never touches the live branch)
 *   2. work out which migrations this release adds, by comparing the files on
 *      disk to the branch's own `migrations` table
 *   3. `migration:run`   — the forward path, on real rows
 *   4. `migration:revert` x N — the rollback path, unless a migration in this
 *      release is declared irreversible
 *   5. `migration:run`   — re-apply, because revert-then-redeploy is the actual
 *      incident sequence and a migration can be reversible once but not twice
 *   6. delete the branch
 *
 * Read-only with respect to production: every write lands on the branch. Neon
 * branches are copy-on-write, so this costs seconds rather than a full copy,
 * which is why it can gate every release instead of never running.
 *
 *   node scripts/ci/migration-rehearsal.mjs
 *
 * Environment:
 *   NEON_API_KEY, NEON_PROJECT_ID   (required) control-plane access
 *   NEON_PARENT_BRANCH              branch to copy. Defaults to the project default.
 *   REHEARSAL_KEEP_BRANCH           set to 1 to leave the branch for inspection
 */
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const API_BASE = process.env.NEON_API_BASE || 'https://console.neon.tech/api/v2';
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

// Reserved namespace, mirroring create-restore-point.mjs and
// db-restore-drill.mjs. Cleanup only ever considers branches under this prefix,
// so a human's branch is never at risk.
const PREFIX = 'ci-migration-rehearsal/';

// Migrations whose `down()` is deliberately a no-op, so reverting past them
// proves nothing and the revert phase is skipped when one is in this release.
//
// This list is the second copy of the one in `migrations/migrations.spec.ts`
// (`irreversible`), which names them in prose. Keep the two in step; better
// still, give the migration classes a static marker both can read.
//
//   NormalizeExperienceLevels — the original free-text experience levels are
//     gone once normalized; there is nothing to restore them from.
//   HashRefreshTokens         — reversing it would write bearer credentials
//     back in plaintext, which is the vulnerability it exists to remove.
const IRREVERSIBLE = new Set([
  'NormalizeExperienceLevels1781136000000',
  'HashRefreshTokens1784073600000',
]);

const apiKey = process.env.NEON_API_KEY?.trim();
const projectId = process.env.NEON_PROJECT_ID?.trim();

if (!apiKey || !projectId) {
  throw new Error(
    'NEON_API_KEY and NEON_PROJECT_ID are both required. A production migration ' +
      'must not run without having been rehearsed — see docs/RUNBOOK.md.',
  );
}

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
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise((r) => setTimeout(r, attempt * 3_000));
      continue;
    }
    // 423 Locked means another project operation is in flight; 429 and 5xx are
    // likewise transient. Same policy as create-restore-point.mjs.
    if (response.status === 423 || response.status === 429 || response.status >= 500) {
      lastError = `HTTP ${response.status}`;
      await new Promise((r) => setTimeout(r, attempt * 3_000));
      continue;
    }
    if (!response.ok) {
      throw new Error(
        `Neon API ${method} ${path} failed: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`,
      );
    }
    return response.status === 204 ? {} : response.json();
  }
  throw new Error(`Neon API ${method} ${path} failed: ${lastError}`);
}

/**
 * The migrations on disk, in execution order.
 *
 * `1786003200000-AddLoginHistory.ts` describes the class
 * `AddLoginHistory1786003200000` — the convention `migration:create` generates
 * and the one `migrations.spec.ts` imports by. The glob matches data-source.ts
 * (`migrations/[0-9]*.ts`), so colocated specs and the README are excluded.
 */
function migrationsOnDisk() {
  return readdirSync(new URL('../../migrations', import.meta.url))
    .filter((file) => /^\d+-.+\.ts$/.test(file))
    .map((file) => {
      const [, timestamp, label] = file.match(/^(\d+)-(.+)\.ts$/);
      return { timestamp, name: `${label}${timestamp}`, file };
    })
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
}

/**
 * Timestamps recorded in the branch's own `migrations` table.
 *
 * Matched on timestamp rather than name: the timestamp is what TypeORM orders
 * and de-duplicates by, and it survives a class being renamed.
 */
async function appliedTimestamps(connectionString) {
  const client = new Client({
    connectionString,
    // Neon requires TLS; CI runners have the CA bundle.
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 30_000,
    statement_timeout: 60_000,
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      "SELECT to_regclass('public.migrations') IS NOT NULL AS present",
    );
    if (!rows[0].present) {
      // The branch came from production, so this table exists there. If it does
      // not, the parent is not the database this release migrates and the whole
      // rehearsal would be measuring the wrong thing.
      throw new Error(
        'The branched database has no `migrations` table. Check NEON_PARENT_BRANCH ' +
          'points at the production database — see migrations/README.md.',
      );
    }
    // `timestamp` is quoted because it is also a type name in Postgres, which
    // makes the bare identifier ambiguous in some positions. TypeORM quotes it
    // for the same reason.
    const applied = await client.query('SELECT "timestamp" FROM migrations');
    return new Set(applied.rows.map((row) => String(row.timestamp)));
  } finally {
    await client.end();
  }
}

/**
 * Never let the branch's connection string reach the log. It carries a
 * password, and TypeORM's `logging: ['query','error','schema']` makes this
 * script's output verbose enough that a leak would be easy to miss.
 */
function redact(text, uri) {
  return text
    .split(uri)
    .join('postgresql://[redacted]')
    .replace(/(postgres(?:ql)?:\/\/)[^:@\s]+:[^@\s]+@/g, '$1[redacted]:[redacted]@');
}

/**
 * Run one npm script against the branch and return how it went.
 *
 * DATABASE_URL is passed explicitly, which is what makes this safe: per
 * migrations/README.md, `dotenv` does not override an already-set variable, so
 * the value here always wins over a local `.env` and these commands can never
 * fall through to production.
 */
function runMigrationCommand(script, uri) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn('npm', ['run', script], {
      cwd: REPO_ROOT,
      env: { ...process.env, DATABASE_URL: uri },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });

    child.on('error', (error) => {
      resolve({ ok: false, ms: Date.now() - startedAt, output: String(error.message) });
    });
    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        code,
        ms: Date.now() - startedAt,
        output: redact(output, uri),
      });
    });
  });
}

function seconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

const phases = [];
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const branchName = `${PREFIX}${stamp}`;
const keepBranch = process.env.REHEARSAL_KEEP_BRANCH?.trim() === '1';
let branchId;
let uri;

/**
 * Run a phase, record its timing, and stop the rehearsal if it fails.
 * Returns false when the caller should stop.
 */
async function phase(title, script) {
  console.log(`\n--- ${title} ---`);
  const result = await runMigrationCommand(script, uri);
  phases.push({ title, ok: result.ok, ms: result.ms });
  console.log(result.output.trimEnd());

  if (result.ok) {
    console.log(`  OK in ${seconds(result.ms)}`);
    return true;
  }

  console.error(`::error::${title} failed (exit ${result.code}) after ${seconds(result.ms)}.`);
  process.exitCode = 1;
  return false;
}

try {
  // ------------------------------------------------------------- branch ----
  const { branches = [] } = await neon('/branches');

  // Neon renamed `primary` to `default`; accept either, as
  // create-restore-point.mjs does.
  const parentName = process.env.NEON_PARENT_BRANCH?.trim();
  const parent = parentName
    ? branches.find((branch) => branch.name === parentName)
    : branches.find((branch) => branch.default === true || branch.primary === true);

  if (!parent) {
    throw new Error(
      parentName
        ? `Branch "${parentName}" does not exist in project ${projectId}.`
        : `Could not identify the default branch of project ${projectId}. Set NEON_PARENT_BRANCH explicitly.`,
    );
  }

  console.log(`Branching "${parent.name}" (${parent.id}) as "${branchName}"...`);

  // A read_write endpoint, unlike create-restore-point.mjs: a restore point is
  // storage-only because nothing connects to it, whereas this branch exists
  // precisely to be migrated. The endpoint is deleted with the branch below.
  const t0 = Date.now();
  const created = await neon('/branches', {
    method: 'POST',
    body: {
      branch: { name: branchName, parent_id: parent.id },
      endpoints: [{ type: 'read_write' }],
    },
  });
  branchId = created?.branch?.id;
  if (!branchId) {
    throw new Error(
      `Neon accepted the request but returned no branch id: ${JSON.stringify(created).slice(0, 300)}`,
    );
  }
  const branchMs = Date.now() - t0;
  console.log(`  branch ready in ${seconds(branchMs)}  (${branchId})`);

  uri =
    created.connection_uris?.[0]?.connection_uri ||
    (
      await neon(
        `/branches/${encodeURIComponent(branchId)}/connection_uri?database_name=neondb&role_name=neondb_owner`,
      )
    )?.uri;
  if (!uri) {
    throw new Error(
      'Neon did not return a connection URI for the branch. The branch exists — ' +
        'inspect it in the console before deleting.',
    );
  }

  // ------------------------------------------------------------ pending ----
  const onDisk = migrationsOnDisk();
  const applied = await appliedTimestamps(uri);
  const pending = onDisk.filter((migration) => !applied.has(migration.timestamp));

  console.log(
    `\n${onDisk.length} migration(s) on disk, ${applied.size} applied to production, ` +
      `${pending.length} pending.`,
  );

  if (pending.length === 0) {
    // The common case. Most releases change no schema, and a rehearsal with
    // nothing to rehearse must not look like a pass that proved something.
    console.log('\nThis release adds no migrations. Nothing to rehearse.');
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        '### Migration rehearsal\n\nThis release adds no migrations — nothing to rehearse.\n',
      );
    }
  } else {
    for (const migration of pending) {
      console.log(`  pending: ${migration.name}`);
    }

    const blocked = pending.filter((migration) => IRREVERSIBLE.has(migration.name));

    // ------------------------------------------------------------ forward ----
    let advanced = await phase(
      `Forward: applying ${pending.length} migration(s) to real data`,
      'migration:run',
    );

    // Prove the forward run actually recorded what it claimed, rather than
    // exiting 0 having skipped the pending set.
    if (advanced) {
      const after = await appliedTimestamps(uri);
      const missing = pending.filter((migration) => !after.has(migration.timestamp));
      if (missing.length > 0) {
        console.error(
          `::error::migration:run exited 0 but did not record: ${missing.map((m) => m.name).join(', ')}`,
        );
        process.exitCode = 1;
        advanced = false;
      } else {
        console.log(`  all ${pending.length} migration(s) recorded in the migrations table`);
      }
    }

    // ------------------------------------------------------------ reverse ----
    if (advanced && blocked.length > 0) {
      // Not a failure. These are a deliberate design decision, documented in
      // migrations.spec.ts and asserted there.
      console.log(
        `\n--- Reverse: skipped ---\n  ${blocked
          .map((m) => m.name)
          .join(', ')} is intentionally irreversible, so reverting past it would ` +
          'prove nothing. Forward path above is still verified.',
      );
      phases.push({ title: 'Reverse: skipped (irreversible migration in release)', ok: true, ms: 0 });
    } else if (advanced) {
      for (let i = pending.length; i >= 1; i -= 1) {
        const target = pending[i - 1];
        if (!(await phase(`Reverse: reverting ${target.name}`, 'migration:revert'))) {
          advanced = false;
          break;
        }
      }

      // ----------------------------------------------------------- redo ----
      // Revert, fix, redeploy is the sequence RUNBOOK §5 actually prescribes,
      // and a migration can be reversible once without being re-appliable —
      // a `down()` that drops a column but leaves its index behind fails the
      // second `up()`, and nothing before this step would catch it.
      if (advanced) {
        await phase('Re-apply: running the forward path a second time', 'migration:run');
      }
    }
  }

  // ------------------------------------------------------------ summary ----
  if (phases.length > 0) {
    console.log('\n--- migration rehearsal ---');
    for (const entry of phases) {
      console.log(`  ${entry.ok ? 'ok  ' : 'FAIL'}  ${seconds(entry.ms).padStart(7)}  ${entry.title}`);
    }
    const total = phases.reduce((sum, entry) => sum + entry.ms, 0);
    console.log(`  ${' '.repeat(4)}  ${seconds(total).padStart(7)}  TOTAL`);

    if (process.env.GITHUB_STEP_SUMMARY) {
      // Named from our own configuration rather than from `parent.name`, which
      // arrived in a Neon API response. Writing HTTP response data to a file is
      // a real taint flow (CodeQL js/http-to-file-access), and a branch name
      // this script did not choose would also be free to inject markdown into
      // the job summary. When NEON_PARENT_BRANCH is set the two are identical
      // by construction — the branch is looked up *by* that name above.
      const parentLabel = process.env.NEON_PARENT_BRANCH?.trim()
        ? `\`${process.env.NEON_PARENT_BRANCH.trim()}\``
        : 'the production default branch';

      const lines = [
        '### Migration rehearsal',
        '',
        `Rehearsed against a copy-on-write branch of ${parentLabel}.`,
        '',
        '| Phase | Result | Time |',
        '| --- | --- | --- |',
        ...phases.map(
          (entry) => `| ${entry.title} | ${entry.ok ? 'pass' : '**FAIL**'} | ${seconds(entry.ms)} |`,
        ),
        '',
        `Total ${seconds(total)}. Production was not touched.`,
        '',
      ];
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
    }
  }

  if (process.exitCode === 1) {
    console.error(
      '\nThis release must not migrate production. The failure above would have ' +
        'happened in the `migrate` job, against live data.',
    );
  } else if (phases.length > 0) {
    console.log('\nRehearsal passed. These migrations apply to production-shaped data.');
  }
  // No `else`: a release with no pending migrations already said so, and must
  // not print a pass line claiming migrations were verified against real data.
} finally {
  // Always clean up. A rehearsal that leaks branches hits Neon's per-project
  // branch limit and starts failing every release.
  if (branchId && !keepBranch) {
    try {
      await neon(`/branches/${encodeURIComponent(branchId)}`, { method: 'DELETE' });
      console.log(`\nDeleted rehearsal branch ${branchName} (${branchId})`);
    } catch (error) {
      console.error(
        `\n::warning::Could not delete rehearsal branch ${branchId} ` +
          `(${error instanceof Error ? error.message : error}). Delete it manually — ` +
          `it is named ${branchName}.`,
      );
    }
  } else if (branchId) {
    console.log(
      `\nKept rehearsal branch ${branchName} (${branchId}) — REHEARSAL_KEEP_BRANCH=1. ` +
        'Delete it when you are done; it counts against the project branch limit.',
    );
  }
}
