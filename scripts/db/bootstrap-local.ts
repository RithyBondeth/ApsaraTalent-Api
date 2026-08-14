/**
 * Create a working schema in an EMPTY local database.
 *
 * Why this exists: `migrations/` only describes changes made *after* the
 * original schema, which was created by `synchronize` and then baselined. The
 * first migration ALTERs a `chat` table it does not create, so
 * `npm run migration:run` cannot bootstrap a fresh database — it fails with
 * `relation "chat" does not exist`. Neither can `migration:baseline`, which
 * records history without executing SQL and says so.
 *
 * So this script does what originally happened: install the extensions the
 * entities and migrations depend on, then build the schema from today's
 * entities via a one-shot `synchronize`.
 *
 * It deliberately stops there. A schema built from current entities already
 * contains every migration's effect, so the history still needs recording —
 * but `migration:baseline` exists for exactly that, and duplicating it here
 * would be a second implementation to keep in step. Run, in order:
 *
 *   npm run db:bootstrap-local -- --apply
 *   npm run migration:baseline -- --apply
 *   npm run seed
 *
 * After that `npm run migration:run` is a no-op and future migrations apply
 * normally.
 *
 * Usage:
 *   npm run db:bootstrap-local              # dry run — prints what it would do
 *   npm run db:bootstrap-local -- --apply   # actually create the schema
 *
 * REFUSES to run against anything but a loopback host. `synchronize` rewrites
 * schema to match entities; pointing that at a shared or production database
 * would be destructive, so the guard is not optional.
 */
import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseConfig } from '@app/common/database/config/database.config';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const REQUIRED_EXTENSIONS = ['uuid-ossp', 'pg_trgm', 'vector'];

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL is not set — refusing to run.');
  }

  const target = new URL(url);
  if (!LOCAL_HOSTS.has(target.hostname)) {
    throw new Error(
      `Refusing to bootstrap a non-local database (${target.hostname}). ` +
        'This script runs `synchronize`, which rewrites schema to match the ' +
        'entities. Point DATABASE_URL at a loopback host first.',
    );
  }

  console.log(
    `\nTarget database: ${target.host}${target.pathname}  (user: ${target.username})`,
  );
  console.log(
    apply ? 'Mode: APPLY\n' : 'Mode: DRY RUN (pass --apply to write)\n',
  );

  // The entity list lives in the Nest database config, not in data-source.ts —
  // that file deliberately omits entities so migrations never depend on the
  // current model. Bootstrapping is the one job that needs the opposite.
  const config = await databaseConfig({
    get: (key: string) =>
      key === 'database.url'
        ? url
        : key === 'database.synchronize'
          ? true
          : undefined,
  } as never);

  const bootstrapSource = new DataSource({
    ...config,
    synchronize: false, // switched on explicitly below, after the extensions exist
    logging: ['error', 'schema'],
  });

  await bootstrapSource.initialize();

  try {
    const existing: { table_name: string }[] = await bootstrapSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`,
    );

    if (existing.length > 0) {
      console.log(
        `This database already has ${existing.length} table(s). Bootstrap is ` +
          'for empty databases only — drop it and recreate, or use a fresh one.',
      );
      return;
    }

    console.log('Extensions to install:');
    for (const extension of REQUIRED_EXTENSIONS) {
      console.log(`  CREATE EXTENSION IF NOT EXISTS "${extension}"`);
    }
    console.log(`\nEntities to synchronize: ${config.entities?.length ?? 0}`);

    if (!apply) {
      console.log('\nDry run complete. Re-run with --apply to execute.');
      return;
    }

    for (const extension of REQUIRED_EXTENSIONS) {
      await bootstrapSource.query(
        `CREATE EXTENSION IF NOT EXISTS "${extension}";`,
      );
    }
    console.log('Extensions installed.');

    await bootstrapSource.synchronize();
    console.log('Schema created from entities.');

    console.log('\nSchema is in place. Two commands left:');
    console.log(
      '  npm run migration:baseline -- --apply   # record migration history',
    );
    console.log('  npm run seed                            # development data');
  } finally {
    await bootstrapSource.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
