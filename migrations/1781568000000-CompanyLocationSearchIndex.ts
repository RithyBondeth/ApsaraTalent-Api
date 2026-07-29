import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The job-search endpoint filters `company.location ILIKE '%...%'`. A leading
 * wildcard can't use a btree index, so this adds a pg_trgm GIN index — the same
 * treatment already given to employee.location and the job title/description.
 *
 * Originally applied as migrations/20260616_company_location_search_index.sql.
 */
export class CompanyLocationSearchIndex1781568000000 implements MigrationInterface {
  name = 'CompanyLocationSearchIndex1781568000000';

  // CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_location_trgm
        ON company USING gin ("location" gin_trgm_ops);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Deliberately NOT `DROP INDEX CONCURRENTLY`. TypeORM honours the
    // `transaction = false` flag above when running `up`, but its
    // undoLastMigration path always opens a transaction unless the whole
    // DataSource is set to `transaction: 'none'` — so CONCURRENTLY would fail
    // here with "cannot run inside a transaction block".
    //
    // A plain DROP INDEX is a fast catalog update; it takes a brief ACCESS
    // EXCLUSIVE lock rather than the long build that made CONCURRENTLY
    // necessary on the way up.
    await queryRunner.query(`DROP INDEX IF EXISTS idx_company_location_trgm;`);
  }
}
