import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * Standalone DataSource used ONLY by the TypeORM CLI (migration:run / :revert /
 * :show) and by scripts/db/baseline-migrations.ts.
 *
 * It deliberately does not import the Nest ConfigModule or the entity list:
 * migrations must be able to run against a database without booting the app,
 * and they must never depend on the current shape of the entities (a migration
 * describes the schema at a point in time, not today's model).
 *
 * `synchronize` is hard-false here. Schema changes come from migrations only.
 *
 * `migrationsTransactionMode: 'each'` wraps every migration in its own
 * transaction, so a failure rolls that migration back and leaves the ones
 * before it applied. Individual migrations opt out with `transaction = false`
 * when they contain statements Postgres forbids inside a transaction block
 * (CREATE INDEX CONCURRENTLY, ALTER TYPE ... ADD VALUE).
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  migrationsRun: false,
  // Timestamp-prefixed files are executable migrations. Restricting the glob
  // prevents colocated Jest specs from being imported by ts-node in release
  // commands (where `describe`/`it` do not exist).
  migrations: ['migrations/[0-9]*.ts'],
  migrationsTableName: 'migrations',
  migrationsTransactionMode: 'each',
  logging: ['query', 'error', 'schema'],
  // Migrations can legitimately take longer than the 15s statement_timeout the
  // application pool sets (index builds, backfills), so no timeout is set here.
  extra: {
    max: 2,
    connectionTimeoutMillis: 10000,
  },
});

// NOTE: exactly one DataSource export. The TypeORM CLI rejects this file with
// "Given data source file must contain only one export of DataSource instance"
// if a `export default AppDataSource` is added alongside the named export.
