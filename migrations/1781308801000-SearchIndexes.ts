import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * pg_trgm + btree indexes backing the employee and job search endpoints.
 * Originally applied as migrations/20260613_search_indexes.sql.
 */
export class SearchIndexes1781308801000 implements MigrationInterface {
  name = 'SearchIndexes1781308801000';

  // CREATE INDEX CONCURRENTLY cannot run inside a transaction block. Building
  // concurrently is what keeps this migration from taking an ACCESS EXCLUSIVE
  // lock on employee/job, which on a live table would block all writes for the
  // duration of the build.
  //
  // Trade-off: without a transaction, a failure part-way leaves the earlier
  // indexes created. Every statement is IF NOT EXISTS, so re-running finishes
  // the job. A cancelled CONCURRENTLY build can leave an INVALID index behind —
  // see the runbook in migrations/README.md for how to detect and drop those.
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    const statements = [
      // Employee: trigram indexes for ILIKE searches
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_job_trgm
         ON employee USING gin ("job" gin_trgm_ops)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_firstname_trgm
         ON employee USING gin ("firstname" gin_trgm_ops)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_lastname_trgm
         ON employee USING gin ("lastname" gin_trgm_ops)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_location_trgm
         ON employee USING gin ("location" gin_trgm_ops)`,

      // Employee: equality column indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_is_hide
         ON employee ("isHide")`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_availability
         ON employee ("availability")`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_years_of_experience
         ON employee ("yearsOfExperience")`,

      // Job: trigram indexes for ILIKE searches
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_title_trgm
         ON job USING gin ("title" gin_trgm_ops)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_description_trgm
         ON job USING gin ("description" gin_trgm_ops)`,

      // Job: equality / range column indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_expire_date
         ON job ("expireDate")`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_type
         ON job ("type")`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_experience_required
         ON job ("experienceRequired")`,

      // Education degree: trigram for ILIKE
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_education_degree_trgm
         ON education USING gin ("degree" gin_trgm_ops)`,
    ];

    // Some older databases predate the structured salary columns. A later
    // migration adds and backfills them, then creates this index. Keep this
    // migration compatible with both schema generations so a partial run can
    // be safely resumed.
    const salaryColumns = (await queryRunner.query(`
      SELECT "column_name"
      FROM "information_schema"."columns"
      WHERE "table_schema" = 'public'
        AND "table_name" = 'job'
        AND "column_name" IN ('salaryMin', 'salaryMax');
    `)) as { column_name: string }[] | undefined;

    if (Array.isArray(salaryColumns) && salaryColumns.length === 2) {
      statements.push(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_salary_range
           ON job ("salaryMin", "salaryMax")`,
      );
    }

    for (const statement of statements) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      'idx_employee_job_trgm',
      'idx_employee_firstname_trgm',
      'idx_employee_lastname_trgm',
      'idx_employee_location_trgm',
      'idx_employee_is_hide',
      'idx_employee_availability',
      'idx_employee_years_of_experience',
      'idx_job_title_trgm',
      'idx_job_description_trgm',
      'idx_job_expire_date',
      'idx_job_type',
      'idx_job_experience_required',
      'idx_job_salary_range',
      'idx_education_degree_trgm',
    ];

    // Deliberately NOT `DROP INDEX CONCURRENTLY`. TypeORM honours the
    // `transaction = false` flag above when running `up`, but its
    // undoLastMigration path always opens a transaction unless the whole
    // DataSource is set to `transaction: 'none'` — so CONCURRENTLY would fail
    // here with "cannot run inside a transaction block".
    //
    // A plain DROP INDEX is a fast catalog update; it takes a brief ACCESS
    // EXCLUSIVE lock rather than the long build that made CONCURRENTLY
    // necessary on the way up.
    for (const index of indexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${index};`);
    }
  }
}
