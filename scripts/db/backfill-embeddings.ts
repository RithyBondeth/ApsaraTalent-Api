/**
 * Backfill Embeddings Script
 * Generates OpenAI text-embedding-3-small vectors for:
 *   1. CareerScope.embedding     — name of each career scope
 *   2. Employee.jobEmbedding     — employee's current job/position title
 *   3. Job.titleEmbedding        — company open-position title
 *
 * Run once (or after adding new rows):
 *   npm run backfill:embeddings
 *
 * Safe to re-run — only rows with NULL embedding are processed.
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';
import OpenAI from 'openai';

// Load .env — try root first, fall back to libs/.env (mirrors seed.ts pattern)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../libs/.env') });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌  OPENAI_API_KEY is not set in the environment.');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌  DATABASE_URL is not set in the environment.');
    process.exit(1);
  }

  console.log('🔌 Connecting to database…');
  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
    synchronize: false,
    entities: [],
  });
  await dataSource.initialize();
  console.log('✅ Connected\n');

  // Verify pgvector is available
  try {
    await dataSource.query(`SELECT '[1,2,3]'::vector(3)`);
  } catch {
    console.error(
      '❌  pgvector extension not found. Run the migration first:\n' +
        '    migrations/20260516_add_pgvector_career_scope.sql',
    );
    await dataSource.destroy();
    process.exit(1);
  }

  const openAI = new OpenAI({ apiKey });

  /** Embed a single text string and return a pgvector-compatible string '[...]' */
  async function embedText(text: string): Promise<string> {
    const response = await openAI.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.trim(),
    });
    return `[${response.data[0].embedding.join(',')}]`;
  }

  let totalSucceeded = 0;
  let totalFailed = 0;

  // ── 1. Career scopes ────────────────────────────────────────────────────────
  const pendingScopes: { id: string; name: string }[] = await dataSource.query(
    `SELECT id, name FROM career_scope WHERE embedding IS NULL ORDER BY name`,
  );

  if (pendingScopes.length > 0) {
    console.log(`📋 ${pendingScopes.length} career scope(s) to embed:`);
    for (const cs of pendingScopes) {
      try {
        process.stdout.write(`   [scope] "${cs.name}"… `);
        const vector = await embedText(cs.name);
        await dataSource.query(
          `UPDATE career_scope SET embedding = $1::vector WHERE id = $2`,
          [vector, cs.id],
        );
        console.log('✅');
        totalSucceeded++;
        await sleep(25);
      } catch (err) {
        console.log(`❌ ${(err as Error).message}`);
        totalFailed++;
      }
    }
  } else {
    console.log('✅ Career scopes: all embeddings present.');
  }

  // ── 2. Employee job titles ───────────────────────────────────────────────────
  const pendingEmployees: { id: string; job: string }[] =
    await dataSource.query(
      `SELECT id, job FROM employee WHERE "jobEmbedding" IS NULL AND job IS NOT NULL AND job <> '' ORDER BY id`,
    );

  if (pendingEmployees.length > 0) {
    console.log(
      `\n📋 ${pendingEmployees.length} employee job title(s) to embed:`,
    );
    for (const emp of pendingEmployees) {
      try {
        process.stdout.write(`   [employee job] "${emp.job}"… `);
        const vector = await embedText(emp.job);
        await dataSource.query(
          `UPDATE employee SET "jobEmbedding" = $1::vector WHERE id = $2`,
          [vector, emp.id],
        );
        console.log('✅');
        totalSucceeded++;
        await sleep(25);
      } catch (err) {
        console.log(`❌ ${(err as Error).message}`);
        totalFailed++;
      }
    }
  } else {
    console.log('\n✅ Employee job titles: all embeddings present.');
  }

  // ── 3. Job (open position) titles ────────────────────────────────────────────
  const pendingJobs: { id: string; title: string }[] = await dataSource.query(
    `SELECT id, title FROM job WHERE "titleEmbedding" IS NULL AND title IS NOT NULL AND title <> '' ORDER BY id`,
  );

  if (pendingJobs.length > 0) {
    console.log(`\n📋 ${pendingJobs.length} open position title(s) to embed:`);
    for (const job of pendingJobs) {
      try {
        process.stdout.write(`   [job title] "${job.title}"… `);
        const vector = await embedText(job.title);
        await dataSource.query(
          `UPDATE job SET "titleEmbedding" = $1::vector WHERE id = $2`,
          [vector, job.id],
        );
        console.log('✅');
        totalSucceeded++;
        await sleep(25);
      } catch (err) {
        console.log(`❌ ${(err as Error).message}`);
        totalFailed++;
      }
    }
  } else {
    console.log('\n✅ Open position titles: all embeddings present.');
  }

  console.log(
    `\n🏁 Done — ${totalSucceeded} succeeded, ${totalFailed} failed.\n` +
      (totalFailed > 0 ? '   Re-run to retry failed rows.\n' : ''),
  );

  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
