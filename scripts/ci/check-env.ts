/**
 * Standalone env validator. Reuses the SAME Joi schema the app enforces at
 * boot (libs/common/src/config/validation.schema.ts), so this check can never
 * drift from runtime behaviour. Unlike booting a service, it needs no DB,
 * Redis, or network — it just parses a .env file and validates it.
 *
 *   npm run check:env            # validates .env
 *   npm run check:env -- .env .env.production
 *
 * Exits non-zero if any file is missing or fails validation, so it is safe to
 * gate CI on it.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { validationSchema } from '../libs/common/src/config/validation.schema';

const files = process.argv.slice(2);
if (files.length === 0) files.push('.env');

let failed = false;

for (const file of files) {
  const abs = path.resolve(process.cwd(), file);

  if (!fs.existsSync(abs)) {
    console.error(`✗ ${file}: file not found`);
    failed = true;
    continue;
  }

  const parsed = dotenv.parse(fs.readFileSync(abs));
  const { error } = validationSchema.validate(parsed, {
    // Match the app's ConfigModule options, but report every problem at once.
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    console.error(`✗ ${file}: ${error.details.length} problem(s)`);
    for (const d of error.details) console.error(`   - ${d.message}`);
    failed = true;
  } else {
    const sentry = parsed.SENTRY_DSN?.trim()
      ? 'Sentry ON'
      : 'Sentry off (no DSN)';
    console.log(`✓ ${file}: valid  [${sentry}]`);
  }
}

process.exit(failed ? 1 : 0);
