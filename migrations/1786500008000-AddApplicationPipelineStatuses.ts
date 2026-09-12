import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add 'interviewing', 'offered' and 'withdrawn' to `application_status_enum`.
 *
 * The pipeline shipped as pending → reviewed → shortlisted → rejected → hired,
 * which is missing the two stages that carry a decision (an interview is
 * happening; an offer is out) and instead spends a label on 'reviewed', which
 * no recruiter ever sets by hand. 'reviewed' stays — Postgres cannot remove an
 * enum label, and rows may hold it — but nothing transitions into it any more;
 * `Application.reviewedAt` answers that question by being stamped rather than
 * clicked.
 *
 * 'withdrawn' exists because `withdrawApplication` used to `DELETE` the row.
 * Every withdrawal was silently erased from the funnel, so the one number a
 * hiring product must be able to produce — how many candidates dropped out, and
 * from which stage — was unrecoverable. It becomes a status here.
 *
 * The labels are inserted positionally so `ORDER BY status` still walks the
 * pipeline in pipeline order rather than in the order the labels happened to be
 * added.
 *
 * `transaction = false` because `ALTER TYPE ... ADD VALUE` may not be used in
 * the transaction that adds it; the columns that read these labels arrive in
 * the next migration, after this one has committed.
 */
export class AddApplicationPipelineStatuses1786500008000 implements MigrationInterface {
  name = 'AddApplicationPipelineStatuses1786500008000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "application_status_enum"
        ADD VALUE IF NOT EXISTS 'interviewing' AFTER 'shortlisted';
    `);
    await queryRunner.query(`
      ALTER TYPE "application_status_enum"
        ADD VALUE IF NOT EXISTS 'offered' AFTER 'interviewing';
    `);
    await queryRunner.query(`
      ALTER TYPE "application_status_enum"
        ADD VALUE IF NOT EXISTS 'withdrawn' AFTER 'hired';
    `);
  }

  public async down(): Promise<void> {
    // Deliberately empty. Postgres has no `ALTER TYPE ... DROP VALUE`, so the
    // only reversal is recreating the type and rewriting every column that uses
    // it — which would fail anyway on any row that had reached one of the new
    // stages. Recorded in migrations/irreversible.json.
  }
}
