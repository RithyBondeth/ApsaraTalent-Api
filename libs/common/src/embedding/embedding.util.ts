import {
  SCOPE_SIMILARITY_THRESHOLD,
  JOB_TITLE_SIMILARITY_THRESHOLD,
} from './embedding.service';

/**
 * Parse a pgvector text representation into a number array.
 * Postgres returns vector columns as '[0.1,0.2,...]' strings when read
 * through a TypeORM text-mapped column.
 */
export function parseEmbedding(
  str: string | null | undefined,
): number[] | null {
  if (!str) return null;
  try {
    return JSON.parse(str) as number[];
  } catch {
    return null;
  }
}

/**
 * Cosine similarity between two vectors.
 * OpenAI text-embedding-3-small vectors are already L2-normalised,
 * so this is equivalent to the dot product and always falls in [0, 1].
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

type ScopeWithEmbedding = { id: string; embedding?: string | null };
type TitleWithEmbedding = { titleEmbedding?: string | null };

/**
 * Compute a semantic job-title similarity score between an employee's current
 * position (or "looking for" position) and a set of open job positions.
 *
 * Uses JOB_TITLE_SIMILARITY_THRESHOLD (0.70) — tighter than scope matching
 * because job titles are specific: "Backend Engineer" should match
 * "Backend Developer" (0.762) but not "Project Manager" (~0.45).
 *
 * @param employeeJobEmbedding  Parsed number[] of the employee's job field embedding.
 * @param jobs                  Open positions to compare against.
 * @param maxScore              Maximum points this factor can award (e.g. 20).
 * @returns                     A score in [0, maxScore].
 */
export function jobTitleSimilarityScore(
  employeeJobEmbedding: number[] | null,
  jobs: TitleWithEmbedding[],
  maxScore: number,
): number {
  if (!employeeJobEmbedding || !jobs.length) return 0;

  let bestSim = 0;
  for (const job of jobs) {
    const embB = parseEmbedding(job.titleEmbedding);
    if (!embB) continue;
    const sim = cosineSimilarity(employeeJobEmbedding, embB);
    if (sim > bestSim) bestSim = sim;
  }

  return bestSim >= JOB_TITLE_SIMILARITY_THRESHOLD ? bestSim * maxScore : 0;
}

/**
 * Compute a weighted career-scope similarity score between two scope sets.
 *
 * For each scope in `refScopes` that has an embedding, finds the best
 * cosine-similarity match in `candidateScopes`.  Similarities above
 * `SCOPE_SIMILARITY_THRESHOLD` contribute their score; those below
 * (i.e. truly unrelated fields) contribute zero — preventing unrelated
 * candidates from accumulating false points.
 *
 * Falls back to exact ID-overlap counting when neither side has embeddings
 * (e.g. during initial setup before the backfill script has been run).
 *
 * @param refScopes       The "query" side — the user whose recommendations are being computed.
 * @param candidateScopes The "target" side — the candidate being scored.
 * @param maxScore        The maximum points this factor can award (e.g. 35).
 * @returns               A score in [0, maxScore].
 */
export function scopeSetSimilarityScore(
  refScopes: ScopeWithEmbedding[],
  candidateScopes: ScopeWithEmbedding[],
  maxScore: number,
): number {
  if (!refScopes.length || !candidateScopes.length) return 0;

  const refEmbeddings = refScopes.map((s) => parseEmbedding(s.embedding));
  const candEmbeddings = candidateScopes.map((s) =>
    parseEmbedding(s.embedding),
  );

  const hasEmbeddings =
    refEmbeddings.some(Boolean) && candEmbeddings.some(Boolean);

  // ── Fallback: exact ID overlap (no embeddings yet) ─────────────────
  if (!hasEmbeddings) {
    const refIds = new Set(refScopes.map((s) => s.id));
    const overlap = candidateScopes.filter((s) => refIds.has(s.id)).length;
    return refScopes.length > 0 ? (overlap / refScopes.length) * maxScore : 0;
  }

  // ── Semantic scoring ───────────────────────────────────────────────
  // For each ref scope with an embedding, find the best-matching candidate.
  // Only similarities ≥ threshold count — this keeps unrelated fields
  // (e.g. "Marketing" vs "Software Engineering") from earning any points.
  let totalSim = 0;
  let countedRef = 0;

  for (let i = 0; i < refScopes.length; i++) {
    const embA = refEmbeddings[i];
    if (!embA) continue; // scope has no embedding yet — skip

    let bestSim = 0;
    for (let j = 0; j < candidateScopes.length; j++) {
      const embB = candEmbeddings[j];
      if (!embB) continue;
      const sim = cosineSimilarity(embA, embB);
      if (sim > bestSim) bestSim = sim;
    }

    // Only reward matches that cross the relevance threshold
    totalSim += bestSim >= SCOPE_SIMILARITY_THRESHOLD ? bestSim : 0;
    countedRef++;
  }

  return countedRef > 0 ? (totalSim / countedRef) * maxScore : 0;
}
