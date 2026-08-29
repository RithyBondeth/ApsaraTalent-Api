import { CAREER_SCOPE } from '@app/contracts/constants/domain/career-scope.constant';
import { PinoLogger } from 'nestjs-pino';
import { DeepPartial, Repository } from 'typeorm';
import { CareerScope } from '../database/entities/career-scope.entity';
import { EmbeddingService } from '../embedding/embedding.service';

/**
 * Cosine similarity above which a submitted scope name is treated as ANOTHER
 * SPELLING of an existing scope rather than a new concept.
 *
 * Deliberately far tighter than SCOPE_SIMILARITY_THRESHOLD (0.55). That one
 * answers "are these two scopes related enough to recommend across?", and is
 * loose on purpose — at 0.55, "DevOps Engineering" matches "Software
 * Engineering" (0.574). Reusing it here would silently merge distinct
 * professions into one row and make them unrecommendable *separately*, which is
 * worse than the duplicate rows this is meant to prevent.
 *
 * 0.95 is near-synonym territory: "Front-End Development" ↔ "Frontend
 * Development" collapses, "DevOps Engineering" ↔ "Software Engineering" does
 * not. When in doubt this errs toward creating the row — a spurious scope is
 * recoverable, a wrongly merged one loses information.
 */
export const SCOPE_DEDUP_THRESHOLD = 0.95;

/**
 * Collapse the cosmetic differences that would otherwise create a second row
 * for the same concept: surrounding and repeated whitespace, and the various
 * dash characters people paste out of word processors.
 *
 * Case is NOT folded here — the name is shown in the UI, so the first spelling
 * submitted wins its display form. Case-insensitivity is handled at lookup
 * time instead, by comparing on the folded value.
 */
export function normalizeScopeName(raw: string): string {
  return raw
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CAREER_SCOPE.NAME_MAX_LENGTH);
}

/** The comparison form: normalized, then case-folded. */
function foldScopeName(raw: string): string {
  return normalizeScopeName(raw).toLowerCase();
}

interface ResolveCareerScopesArgs {
  repository: Repository<CareerScope>;
  embeddingService: EmbeddingService;
  logger: PinoLogger;
  /** Normalized name -> fields used only when the row has to be created. */
  wanted: ReadonlyMap<string, DeepPartial<CareerScope>>;
}

/**
 * Resolve submitted career scope names to rows, reusing an existing scope
 * wherever the submitted name is the same concept under another spelling.
 *
 * `career_scope` is a GLOBAL table read by both recommendation engines, and the
 * name arrives as free text from profile forms. Matching on the exact trimmed
 * string — as the callers used to — meant "Frontend Development", "frontend
 * development" and "Front-End  Development" each earned their own row, their
 * own embedding, and their own entry in the HNSW index, permanently diluting
 * matches for everyone.
 *
 * Three passes, cheapest first:
 *   1. case-insensitive lookup against existing rows — no API call
 *   2. pgvector nearest-neighbour above SCOPE_DEDUP_THRESHOLD — one embed per
 *      genuinely unseen name
 *   3. create, persisting the vector we already computed
 *
 * Pass 2 makes the embed blocking where it used to be fire-and-forget. That is
 * the point: the vector decides whether the row is created at all. It also
 * means a new scope is never left with a NULL embedding when the provider
 * fails mid-write — on failure the row is still created, and the boot-time
 * VectorColumnsService backfill fills the vector in later.
 */
export async function resolveCareerScopes({
  repository,
  embeddingService,
  logger,
  wanted,
}: ResolveCareerScopesArgs): Promise<CareerScope[]> {
  if (wanted.size === 0) return [];

  // Pass 1: case-insensitive match against what already exists. Raw SQL rather
  // than the query builder because `embedding` is mapped `select: false`, and
  // every other statement in this file already has to bypass TypeORM for the
  // pgvector column — keeping them in one idiom is easier to follow.
  const folded = [...wanted.keys()].map(foldScopeName);
  const existing: CareerScope[] = await repository.query(
    `SELECT id, name, description
       FROM career_scope
      WHERE LOWER(name) = ANY($1::text[])`,
    [folded],
  );

  const byFoldedName = new Map(
    existing.map((row) => [foldScopeName(row.name), row]),
  );

  const resolved: CareerScope[] = [];
  const unmatched = new Map<string, DeepPartial<CareerScope>>();

  for (const [name, extra] of wanted) {
    const hit = byFoldedName.get(foldScopeName(name));
    if (hit) {
      resolved.push(hit);
      continue;
    }
    unmatched.set(name, extra);
  }

  // Passes 2 and 3, one unseen name at a time. Sequential rather than parallel
  // so that two spellings of the same new concept in a single submission
  // collapse onto each other: the first creates the row, the second finds it.
  for (const [name, extra] of unmatched) {
    let vector: string | null = null;
    try {
      vector = await embeddingService.embedAsVector(name);
    } catch (err) {
      logger.warn(
        `Failed to embed career scope "${name}", creating without a vector: ${
          (err as Error).message
        }`,
      );
    }

    if (vector) {
      const near = await findNearestScope(repository, vector);
      if (near && near.similarity >= SCOPE_DEDUP_THRESHOLD) {
        logger.info(
          `Reusing career scope "${near.name}" for submitted "${name}" (similarity ${near.similarity.toFixed(3)})`,
        );
        const row = await repository.findOne({ where: { id: near.id } });
        if (row) {
          resolved.push(row);
          continue;
        }
      }
    }

    resolved.push(await createScope(repository, name, extra, vector));
  }

  return resolved;
}

/** Nearest existing scope by cosine distance, or null when none are embedded. */
async function findNearestScope(
  repository: Repository<CareerScope>,
  vector: string,
): Promise<{ id: string; name: string; similarity: number } | null> {
  const rows: { id: string; name: string; similarity: string }[] =
    await repository.query(
      `SELECT id, name, 1 - (embedding <=> $1::vector) AS similarity
         FROM career_scope
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 1`,
      [vector],
    );

  const row = rows[0];
  return row ? { ...row, similarity: Number(row.similarity) } : null;
}

/**
 * Create the scope, then attach its vector.
 *
 * Two statements rather than one INSERT because the embedding column is mapped
 * as `text` with `synchronize: false` — TypeORM must not see the pgvector type,
 * so the vector can only be written through raw SQL. Going through `save()`
 * first keeps entity-level id generation and column defaults in TypeORM's
 * hands, which a hand-written INSERT would have to reproduce.
 *
 * Unlike the fire-and-forget write this replaces, the UPDATE is awaited, so a
 * scope row is visible to the recommendation engines only once it can actually
 * be matched on.
 */
async function createScope(
  repository: Repository<CareerScope>,
  name: string,
  extra: DeepPartial<CareerScope>,
  vector: string | null,
): Promise<CareerScope> {
  const row = (await repository.save(
    repository.create({ ...extra, name } as DeepPartial<CareerScope>),
  )) as CareerScope;

  if (vector) {
    await repository.query(
      `UPDATE career_scope SET embedding = $1::vector WHERE id = $2`,
      [vector, row.id],
    );
  }

  return row;
}
