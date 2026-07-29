/**
 * Baseline the migration history for a database whose schema ALREADY contains
 * the changes described by the existing migrations.
 *
 * Why this exists: some migrations began as loose SQL files that may have been
 * applied by hand before TypeORM started tracking migration history. A database
 * that already has EVERY migration effect but no `migrations` ledger can use
 * this command to record that history without replaying the SQL.
 *
 * This script records migrations as applied WITHOUT executing their SQL.
 *
 * Usage:
 *   npm run migration:baseline              # dry run — prints what it would do
 *   npm run migration:baseline -- --apply   # actually write the rows
 *
 * On a FRESH/empty database do NOT baseline. Run `npm run migration:run`
 * instead, so the SQL actually executes.
 */
import 'dotenv/config';
import { AppDataSource } from '../../data-source';

const MIGRATIONS_TABLE = 'migrations';

async function main() {
  const apply = process.argv.includes('--apply');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — refusing to run.');
  }

  // Show which database we are pointed at, with credentials stripped. Baselining
  // the wrong database silently desynchronizes its migration history, so this
  // is worth being loud about.
  const target = new URL(process.env.DATABASE_URL);
  console.log(
    `\nTarget database: ${target.host}${target.pathname}  (user: ${target.username})`,
  );
  console.log(
    apply ? 'Mode: APPLY\n' : 'Mode: DRY RUN (pass --apply to write)\n',
  );

  await AppDataSource.initialize();

  try {
    const queryRunner = AppDataSource.createQueryRunner();

    const tableCheck = (await queryRunner.query(
      `SELECT to_regclass(format('%I.%I', current_schema(), $1)) IS NOT NULL AS "exists";`,
      [MIGRATIONS_TABLE],
    )) as { exists: boolean }[];
    const migrationsTableExists = tableCheck[0]?.exists ?? false;

    const recorded: { name: string }[] = migrationsTableExists
      ? await queryRunner.query(`SELECT name FROM "${MIGRATIONS_TABLE}";`)
      : [];
    const recordedNames = new Set(recorded.map((r) => r.name));

    // AppDataSource.migrations is populated from the migrations glob at
    // initialize(). Each entry's constructor name is what TypeORM records.
    // Sorted oldest-first so the serial "id" column in the migrations table
    // ends up in the same order as the timestamps. TypeORM orders by timestamp
    // rather than id, so this is cosmetic — but a history table that reads
    // backwards is a confusing thing to hand somebody mid-incident.
    const all = AppDataSource.migrations
      .map((m) => {
        const name = m.constructor.name;
        const timestamp = Number(name.replace(/^\D+/, ''));
        return { name, timestamp };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    if (all.length === 0) {
      throw new Error(
        'No migrations were loaded — check the `migrations` glob in data-source.ts.',
      );
    }

    const pending = all.filter((m) => !recordedNames.has(m.name));

    console.log(`Found ${all.length} migration(s) on disk.`);
    console.log(`Already recorded: ${all.length - pending.length}`);
    console.log(`Would record now: ${pending.length}\n`);

    for (const m of pending) {
      console.log(`  + ${m.name}`);
    }
    if (pending.length === 0) {
      console.log('  (nothing to do — history is already in sync)');
    }

    if (apply && pending.length > 0) {
      if (!migrationsTableExists) {
        // Same DDL TypeORM creates for its own migrations table, so a later
        // migration:run finds exactly what it expects. This is intentionally
        // inside APPLY mode: a dry run must never mutate the target database.
        await queryRunner.query(`
          CREATE TABLE "${MIGRATIONS_TABLE}" (
            "id" SERIAL NOT NULL,
            "timestamp" bigint NOT NULL,
            "name" character varying NOT NULL,
            CONSTRAINT "PK_${MIGRATIONS_TABLE}_id" PRIMARY KEY ("id")
          );
        `);
      }

      for (const m of pending) {
        await queryRunner.query(
          `INSERT INTO "${MIGRATIONS_TABLE}" ("timestamp", "name") VALUES ($1, $2);`,
          [m.timestamp, m.name],
        );
      }
      console.log(`\nRecorded ${pending.length} migration(s) as applied.`);
      console.log('Verify with: npm run migration:show');
    } else if (pending.length > 0) {
      console.log(
        '\nDry run — nothing written. Re-run with --apply to commit.',
      );
    }

    await queryRunner.release();
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  console.error('\nBaseline failed:', error);
  process.exit(1);
});
