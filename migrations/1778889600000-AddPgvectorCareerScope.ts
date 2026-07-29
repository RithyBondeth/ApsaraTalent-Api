import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enable pgvector and add the semantic embedding column to career_scope.
 * Replaces the pg_trgm approach with true semantic similarity via OpenAI
 * embeddings (text-embedding-3-small -> 1536 dimensions).
 *
 * Originally applied as migrations/20260516_add_pgvector_career_scope.sql.
 */
export class AddPgvectorCareerScope1778889600000 implements MigrationInterface {
  name = 'AddPgvectorCareerScope1778889600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    await queryRunner.query(`
      ALTER TABLE career_scope
        ADD COLUMN IF NOT EXISTS embedding vector(1536);
    `);

    // HNSW index for fast approximate cosine-distance nearest-neighbour search.
    // HNSW builds incrementally so it works correctly even with few rows,
    // unlike IVFFlat which requires a minimum number of rows to train.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_career_scope_embedding_hnsw
        ON career_scope
        USING hnsw (embedding vector_cosine_ops);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_career_scope_embedding_hnsw;`,
    );
    // Destructive: drops every stored embedding. Re-populating requires
    // `npm run backfill:embeddings` (and a full pass of OpenAI API calls).
    await queryRunner.query(
      `ALTER TABLE career_scope DROP COLUMN IF EXISTS embedding;`,
    );
    // The `vector` extension is left installed — other tables may use it.
  }
}
