import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import { EmbeddingService } from '../embedding/embedding.service';

@Injectable()
export class VectorColumnsService implements OnApplicationBootstrap {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(VectorColumnsService.name);
  }

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');

      const [csRestored, empRestored, jobRestored] = await Promise.all([
        this.restoreIfNeeded(
          'career_scope',
          'embedding',
          'idx_career_scope_embedding_hnsw',
        ),
        this.restoreIfNeeded(
          'employee',
          'jobEmbedding',
          'idx_employee_job_embedding_hnsw',
        ),
        this.restoreIfNeeded(
          'job',
          'titleEmbedding',
          'idx_job_title_embedding_hnsw',
        ),
      ]);

      // Fire-and-forget re-embedding of any NULL rows (runs in background,
      // doesn't block app startup).
      if (csRestored || empRestored || jobRestored) {
        this.reembedNullRows().catch((err: Error) =>
          this.logger.warn(`Re-embedding after restore failed: ${err.message}`),
        );
      } else {
        // Even without a full restore, catch any rows that somehow still have
        // NULL embeddings (e.g. first run, or partial failure in previous run).
        this.reembedNullRows().catch((err: Error) =>
          this.logger.warn(`Background re-embedding failed: ${err.message}`),
        );
      }
    } catch (err) {
      this.logger.warn(
        `VectorColumnsService: failed to ensure vector columns — ${(err as Error).message}`,
      );
    }
  }

  // ── Column type restoration ──────────────────────────────────────────────────

  /** @returns true if the column was recreated (data was lost and needs re-embedding) */
  private async restoreIfNeeded(
    tableName: string,
    columnName: string,
    indexName: string,
  ): Promise<boolean> {
    const rows: { udt_name: string }[] = await this.dataSource.query(
      `SELECT udt_name FROM information_schema.columns
       WHERE table_name = $1 AND column_name = $2`,
      [tableName, columnName],
    );

    if (rows.length === 0) {
      this.logger.info(
        `VectorColumnsService: creating missing column "${tableName}"."${columnName}"`,
      );
      await this.dataSource.query(
        `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${columnName}" vector(1536)`,
      );
      await this.createHnswIndex(tableName, columnName, indexName);
      return true;
    }

    if (rows[0].udt_name === 'vector') return false; // already correct

    this.logger.warn(
      `VectorColumnsService: "${tableName}"."${columnName}" is "${rows[0].udt_name}" — restoring to vector(1536)`,
    );
    await this.dataSource.query(
      `ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "${columnName}"`,
    );
    await this.dataSource.query(
      `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" vector(1536)`,
    );
    await this.createHnswIndex(tableName, columnName, indexName);
    this.logger.info(
      `VectorColumnsService: restored "${tableName}"."${columnName}" to vector(1536)`,
    );
    return true;
  }

  private async createHnswIndex(
    tableName: string,
    columnName: string,
    indexName: string,
  ): Promise<void> {
    await this.dataSource.query(
      `CREATE INDEX IF NOT EXISTS "${indexName}"
       ON "${tableName}" USING hnsw ("${columnName}" vector_cosine_ops)`,
    );
  }

  // ── Background re-embedding ──────────────────────────────────────────────────

  private async reembedNullRows(): Promise<void> {
    const results = await Promise.allSettled([
      this.reembedCareerScopes(),
      this.reembedEmployeeJobs(),
      this.reembedJobTitles(),
    ]);
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const names = [
          'career_scope.embedding',
          'employee.jobEmbedding',
          'job.titleEmbedding',
        ];
        this.logger.warn(
          `Re-embed failed for ${names[i]}: ${(r.reason as Error).message}`,
        );
      }
    });
  }

  private async reembedCareerScopes(): Promise<void> {
    const rows: { id: string; name: string }[] = await this.dataSource.query(
      `SELECT id, name FROM career_scope WHERE embedding IS NULL AND name IS NOT NULL ORDER BY name`,
    );
    if (rows.length === 0) return;
    this.logger.info(
      `VectorColumnsService: re-embedding ${rows.length} career scope(s)`,
    );
    for (const row of rows) {
      try {
        const vector = await this.embeddingService.embedAsVector(row.name);
        await this.dataSource.query(
          `UPDATE career_scope SET embedding = $1::vector WHERE id = $2`,
          [vector, row.id],
        );
      } catch (err) {
        this.logger.warn(
          `Failed to embed scope "${row.name}": ${(err as Error).message}`,
        );
      }
    }
    this.logger.info(
      `VectorColumnsService: finished re-embedding career scopes`,
    );
  }

  private async reembedEmployeeJobs(): Promise<void> {
    const rows: { id: string; job: string }[] = await this.dataSource.query(
      `SELECT id, job FROM employee WHERE "jobEmbedding" IS NULL AND job IS NOT NULL AND job <> '' ORDER BY id`,
    );
    if (rows.length === 0) return;
    this.logger.info(
      `VectorColumnsService: re-embedding ${rows.length} employee job title(s)`,
    );
    for (const row of rows) {
      try {
        const vector = await this.embeddingService.embedAsVector(row.job);
        await this.dataSource.query(
          `UPDATE employee SET "jobEmbedding" = $1::vector WHERE id = $2`,
          [vector, row.id],
        );
      } catch (err) {
        this.logger.warn(
          `Failed to embed employee job "${row.job}": ${(err as Error).message}`,
        );
      }
    }
    this.logger.info(
      `VectorColumnsService: finished re-embedding employee jobs`,
    );
  }

  private async reembedJobTitles(): Promise<void> {
    const rows: { id: string; title: string }[] = await this.dataSource.query(
      `SELECT id, title FROM job WHERE "titleEmbedding" IS NULL AND title IS NOT NULL AND title <> '' ORDER BY id`,
    );
    if (rows.length === 0) return;
    this.logger.info(
      `VectorColumnsService: re-embedding ${rows.length} job title(s)`,
    );
    for (const row of rows) {
      try {
        const vector = await this.embeddingService.embedAsVector(row.title);
        await this.dataSource.query(
          `UPDATE job SET "titleEmbedding" = $1::vector WHERE id = $2`,
          [vector, row.id],
        );
      } catch (err) {
        this.logger.warn(
          `Failed to embed job title "${row.title}": ${(err as Error).message}`,
        );
      }
    }
    this.logger.info(`VectorColumnsService: finished re-embedding job titles`);
  }
}
