/**
 * Uploads compiled source maps to Sentry so production stack traces show your
 * TypeScript instead of compiled dist/ lines.
 *
 *   node scripts/upload-sourcemaps.mjs [distDir]     # default: ./dist
 *
 * Runs in two steps:
 *   inject  — stamps debug IDs into the .js/.map pairs
 *   upload  — ships them, matched to the build by those debug IDs
 *
 * Skips silently (exit 0) when SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT
 * are unset, so local builds and pull requests are never blocked by it — the
 * same policy next.config.ts uses on the web side.
 *
 * The release MUST match what libs/common/src/sentry/instrument.ts sets at
 * runtime (SENTRY_RELEASE || RAILWAY_GIT_COMMIT_SHA), otherwise Sentry cannot
 * tie an event to the artifacts uploaded for its build.
 */
import 'dotenv/config';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const distDir = process.argv[2] ?? './dist';

const token = process.env.SENTRY_AUTH_TOKEN;
const org = process.env.SENTRY_ORG;
const project = process.env.SENTRY_PROJECT;

if (!token || !org || !project) {
  const missing = [
    !token && 'SENTRY_AUTH_TOKEN',
    !org && 'SENTRY_ORG',
    !project && 'SENTRY_PROJECT',
  ].filter(Boolean);
  console.log(`[sentry] skipping source map upload — missing ${missing.join(', ')}`);
  process.exit(0);
}

if (!existsSync(distDir)) {
  console.error(`[sentry] ${distDir} does not exist — run the build first.`);
  process.exit(1);
}

// Same resolution order as instrument.ts, so events and artifacts line up.
const release = process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA;

// sentry-cli auto-reads .env and warns when it cannot parse it; we already
// loaded it above and pass everything explicitly, so turn that off.
const env = { ...process.env, SENTRY_LOAD_DOTENV: '0' };

function run(args) {
  const res = spawnSync('npx', ['sentry-cli', ...args], { stdio: 'inherit', env });
  if (res.status !== 0) {
    console.error(`[sentry] command failed: sentry-cli ${args.join(' ')}`);
    process.exit(res.status ?? 1);
  }
}

console.log(`[sentry] injecting debug ids into ${distDir}`);
run(['sourcemaps', 'inject', distDir]);

console.log(
  `[sentry] uploading to ${org}/${project}` +
    (release ? ` (release ${release})` : ' (no release set)'),
);
run([
  'sourcemaps',
  'upload',
  '--org',
  org,
  '--project',
  project,
  ...(release ? ['--release', release] : []),
  distDir,
]);

console.log('[sentry] source maps uploaded');
