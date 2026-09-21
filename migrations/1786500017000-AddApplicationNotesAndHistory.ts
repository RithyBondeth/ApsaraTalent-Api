import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The two tables the ATS pipeline needs on top of the existing pipeline
 * columns:
 *
 * `application_note` — private recruiter notes attached to an application.
 * `application_status_history` — an append-only trail of every stage move.
 *
 * Both cascade on the application, and both drop the author/actor to NULL
 * rather than the row: a deleted user should not silently wipe context out
 * from under the team, and a compliance answer for "when did this candidate
 * move to interview" should survive the person who moved them leaving.
 *
 * The status-history table is not backfilled from `statusChangedAt`: that
 * timestamp records the last move only, and inventing a from/to pair for
 * every past application would fabricate history that never happened. New
 * transitions from this migration forward will be logged; older rows show a
 * single first-observed entry the first time the trail is opened, written by
 * the service on read.
 */
export class AddApplicationNotesAndHistory1786500017000 implements MigrationInterface {
  name = 'AddApplicationNotesAndHistory1786500017000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "application_note" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "applicationId" uuid,
        "authorId" uuid,
        "body" text NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_application_note" PRIMARY KEY ("id"),
        CONSTRAINT "FK_application_note_application"
          FOREIGN KEY ("applicationId") REFERENCES "application"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_application_note_author"
          FOREIGN KEY ("authorId") REFERENCES "user"("id")
          ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_application_note_application_created"
        ON "application_note" ("applicationId", "createdAt");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "application_status_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "applicationId" uuid,
        "from" "public"."application_status_enum",
        "to" "public"."application_status_enum" NOT NULL,
        "actorId" uuid,
        "note" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_application_status_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_application_status_history_application"
          FOREIGN KEY ("applicationId") REFERENCES "application"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_application_status_history_actor"
          FOREIGN KEY ("actorId") REFERENCES "user"("id")
          ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_application_status_history_app_created"
        ON "application_status_history" ("applicationId", "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_application_status_history_app_created";`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "application_status_history";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_application_note_application_created";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "application_note";`);
  }
}
