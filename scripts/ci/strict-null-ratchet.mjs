#!/usr/bin/env node
/**
 * Ratchet toward strictNullChecks.
 *
 * The codebase does not compile clean under strictNullChecks yet, so it cannot
 * simply be switched on in tsconfig.json. This gate does the next best thing:
 * it records the current error count and fails if that count goes UP. Existing
 * debt is tolerated; new debt is not, and every fix lowers the bar permanently.
 *
 * When the count reaches zero, delete this script and set strictNullChecks in
 * tsconfig.json for real.
 *
 *   node scripts/strict-null-ratchet.mjs           # check against the baseline
 *   node scripts/strict-null-ratchet.mjs --update  # lower the baseline
 *
 * strictPropertyInitialization stays off: TypeORM entities and DTO classes are
 * populated by the ORM and by Object.assign, so it flags ~876 declarations that
 * are not null-safety problems and would drown the signal.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASELINE_FILE = new URL('./strict-null-baseline.json', import.meta.url);

let output = '';
try {
  execSync('npx tsc -p tsconfig.strict.json --noEmit', { encoding: 'utf8' });
} catch (error) {
  output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
}

const errors = output.split('\n').filter((line) => / error TS\d+:/.test(line));
const count = errors.length;

const CRASH_CODES = /TS18047|TS18048|TS18049|TS2366/;
const crashes = errors.filter((line) => CRASH_CODES.test(line));

if (crashes.length > 0) {
  console.error(
    `\n✗ ${crashes.length} possibly-null dereference(s) — these are latent crashes, not plumbing:\n`,
  );
  for (const line of crashes) console.error(`    ${line}`);
  console.error('');
  process.exit(1);
}

const baseline = existsSync(BASELINE_FILE)
  ? JSON.parse(readFileSync(BASELINE_FILE, 'utf8')).count
  : Number.POSITIVE_INFINITY;

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE_FILE, `${JSON.stringify({ count }, null, 2)}\n`);
  console.log(`Baseline set to ${count}.`);
  process.exit(0);
}

if (count > baseline) {
  console.error(
    `\n✗ strictNullChecks errors rose from ${baseline} to ${count}.\n` +
      `  Fix the new ones, or run: node scripts/strict-null-ratchet.mjs --update\n`,
  );
  const shown = errors.slice(0, 20);
  for (const line of shown) console.error(`    ${line}`);
  process.exit(1);
}

if (count < baseline) {
  console.log(
    `✓ ${count} strictNullChecks errors — down from ${baseline}.\n` +
      `  Lower the bar: node scripts/strict-null-ratchet.mjs --update`,
  );
} else {
  console.log(`✓ ${count} strictNullChecks errors — holding at the baseline.`);
}
