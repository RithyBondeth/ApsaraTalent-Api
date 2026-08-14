/**
 * Rehearse a database restore, end to end, against real production data.
 *
 * RUNBOOK §7 carried "No restore has ever been rehearsed against real
 * production data" as an open item, with the note that restore timing on a real
 * dataset is unknown. That is the last untested recovery path in this system —
 * and on 2026-08-07 every other safety mechanism that had never been exercised
 * turned out to be broken: the rollback workflow could not run, the metrics
 * pipeline had never collected, the Grafana dashboard had never loaded.
 *
 * A restore you have not performed is a belief. This performs one:
 *
 *   1. branch production at a point in time (never touches the live branch)
 *   2. connect to the branch and verify schema and row counts against live
 *   3. report how long each step took
 *   4. delete the branch
 *
 * Entirely read-only with respect to production. Neon branches are
 * copy-on-write, so this costs seconds rather than a full copy, which is
 * exactly why it can run on a schedule instead of never.
 *
 *   node scripts/ci/db-restore-drill.mjs
 *
 * Environment:
 *   NEON_API_KEY, NEON_PROJECT_ID   control-plane access
 *   DATABASE_URL                    live database, read-only comparison
 *   DRILL_MINUTES_AGO               point to recover to (default 60)
 */
import { Client } from 'pg';

const API_BASE =
  process.env.NEON_API_BASE || 'https://console.neon.tech/api/v2';

// Reserved namespace, mirroring create-restore-point.mjs. Cleanup only ever
// considers branches under this prefix, so a human's branch is never at risk.
const PREFIX = 'ci-restore-drill/';

const apiKey = process.env.NEON_API_KEY?.trim();
const projectId = process.env.NEON_PROJECT_ID?.trim();
const liveUrl = process.env.DATABASE_URL?.trim();

if (!apiKey || !projectId || !liveUrl) {
  throw new Error(
    'NEON_API_KEY, NEON_PROJECT_ID and DATABASE_URL are all required.',
  );
}

const minutesAgo = Number.parseInt(process.env.DRILL_MINUTES_AGO || '60', 10);
if (!Number.isInteger(minutesAgo) || minutesAgo < 1) {
  throw new Error('DRILL_MINUTES_AGO must be a positive integer.');
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
    // 423 Locked means another project operation is in flight; both it and 5xx
    // are transient.
    if (response.status === 423 || response.status >= 500) {
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

// Real COUNT(*), not pg_stat_user_tables.n_live_tup.
//
// n_live_tup is a statistics estimate maintained by autovacuum/ANALYZE. A
// freshly created Neon branch has no statistics gathered yet, so EVERY table
// reads as 0 rows no matter what it actually contains — which made the first
// drill run report 20 tables as "empty in restore" when the data was there all
// along. At this database size (13 MB, 27 tables) counting for real costs
// milliseconds and cannot lie.
const TABLES_SQL = `
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`;

async function inspect(connectionString, label) {
  const client = new Client({
    connectionString,
    // Neon requires TLS; CI runners have the CA bundle.
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 30_000,
    statement_timeout: 60_000,
  });
  const startedAt = Date.now();
  await client.connect();
  const connectedMs = Date.now() - startedAt;
  try {
    const names = await client.query(TABLES_SQL);
    const counts = [];
    for (const { table_name: name } of names.rows) {
      // Identifier is quoted, and comes from information_schema rather than
      // anything user-supplied.
      const { rows } = await client.query(
        `SELECT count(*)::int AS rows FROM "${name.replace(/"/g, '""')}"`,
      );
      counts.push({ table: name, rows: rows[0].rows });
    }
    const tables = { rows: counts };
    const size = await client.query(
      'SELECT pg_size_pretty(pg_database_size(current_database())) AS size',
    );
    const migrations = await client.query(
      // TypeORM's table. Missing means the restore produced an empty database,
      // which is the failure mode that matters most and is easy to miss when
      // only counting rows.
      'SELECT count(*)::int AS applied FROM migrations',
    );
    return {
      label,
      connectedMs,
      size: size.rows[0].size,
      migrations: migrations.rows[0].applied,
      tables: new Map(tables.rows.map((r) => [r.table, Number(r.rows)])),
    };
  } finally {
    await client.end();
  }
}

const timings = {};
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const branchName = `${PREFIX}${stamp}`;
let branchId;

try {
  // ---------------------------------------------------------------- live ----
  console.log('Reading the live database for comparison...');
  const live = await inspect(liveUrl, 'live');
  console.log(
    `  live: ${live.tables.size} tables, ${live.migrations} migrations applied, ${live.size}`,
  );

  // ------------------------------------------------------------- restore ----
  const recoverTo = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  console.log(`\nRestoring to ${recoverTo} (${minutesAgo} minutes ago)...`);

  const t0 = Date.now();
  const created = await neon('/branches', {
    method: 'POST',
    body: {
      branch: { name: branchName, parent_timestamp: recoverTo },
      endpoints: [{ type: 'read_write' }],
    },
  });
  branchId = created.branch?.id;
  timings.createBranchMs = Date.now() - t0;
  console.log(
    `  branch created in ${(timings.createBranchMs / 1000).toFixed(1)}s  (${branchId})`,
  );

  const uri =
    created.connection_uris?.[0]?.connection_uri ||
    (
      await neon(
        `/branches/${encodeURIComponent(branchId)}/connection_uri?database_name=neondb&role_name=neondb_owner`,
      )
    )?.uri;
  if (!uri) {
    throw new Error(
      'Neon did not return a connection URI for the restored branch. The branch ' +
        'exists — inspect it in the console before deleting.',
    );
  }

  // -------------------------------------------------------------- verify ----
  console.log('\nVerifying the restored branch...');
  const t1 = Date.now();
  const restored = await inspect(uri, 'restored');
  timings.verifyMs = Date.now() - t1;

  console.log(
    `  restored: ${restored.tables.size} tables, ${restored.migrations} migrations applied, ${restored.size}`,
  );
  console.log(
    `  connected in ${restored.connectedMs}ms, verified in ${(timings.verifyMs / 1000).toFixed(1)}s`,
  );

  const problems = [];
  if (restored.tables.size === 0) {
    problems.push(
      'restored branch has no tables — the restore produced an empty database',
    );
  }
  if (restored.migrations !== live.migrations) {
    problems.push(
      `migration count differs: live ${live.migrations}, restored ${restored.migrations}`,
    );
  }
  for (const [table, liveRows] of live.tables) {
    if (!restored.tables.has(table)) {
      problems.push(`table missing from restore: ${table}`);
      continue;
    }
    // Row counts are approximate (pg_stat_user_tables) and the restore is from
    // an earlier point in time, so it should be <= live, never wildly above.
    const restoredRows = restored.tables.get(table);
    if (liveRows > 0 && restoredRows === 0) {
      problems.push(
        `table empty in restore but has ${liveRows} rows live: ${table}`,
      );
    }
  }

  console.log('\n--- restore drill ---');
  console.log(`  recovered to:     ${recoverTo}`);
  console.log(
    `  branch created:   ${(timings.createBranchMs / 1000).toFixed(1)}s`,
  );
  console.log(`  connect + verify: ${(timings.verifyMs / 1000).toFixed(1)}s`);
  console.log(
    `  TOTAL:            ${((timings.createBranchMs + timings.verifyMs) / 1000).toFixed(1)}s  <-- this is your restore time`,
  );
  console.log(`  database size:    ${restored.size}`);
  console.log(`  tables:           ${restored.tables.size}`);

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s) with the restored data:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
  } else {
    console.log(
      '\nRestore verified: schema and data are present and consistent with live.',
    );
  }
} finally {
  // Always clean up. A drill that leaves branches behind stops being run.
  if (branchId) {
    try {
      await neon(`/branches/${encodeURIComponent(branchId)}`, {
        method: 'DELETE',
      });
      console.log(`\nCleaned up drill branch ${branchId}`);
    } catch (error) {
      console.error(
        `\nWARNING: could not delete drill branch ${branchId} (${error.message}). ` +
          `Delete it manually — it is named ${branchName}.`,
      );
      process.exitCode = 1;
    }
  }
}
