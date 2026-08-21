/**
 * Pure scoring and vector helpers behind RecommendationsService.
 *
 * These carry no repository or cache state, so they live outside the service:
 * the recommendation logic stays readable, and each rule below is directly
 * unit-testable without constructing the service and its five dependencies.
 */

// ── Recommendation tuning ──────────────────────────────────────────────
// The pool is bounded so scoring never scans the whole platform (the cause
// of the original 504s). ANN retrieval picks the most relevant candidates;
// a broad top-up preserves recall when career scopes aren't tagged yet.
export const RECO_POOL_CAP = 200;
export const RECO_SCOPE_ANN_K = 25;
export const RECO_DEFAULT_LIMIT = 10;
export const RECO_MAX_LIMIT = 50;
export const RECO_MIN_SCORE = 10;

// Excludes users blocked in either direction. Expects the root alias `user`
// and binds :reqId. Shared by both recommendation candidate queries.
export const BLOCK_NOT_EXISTS = `NOT EXISTS (
    SELECT 1 FROM user_block ub
    WHERE (ub."blockerId" = :reqId AND ub."blockedId" = "user"."id")
       OR (ub."blockerId" = "user"."id" AND ub."blockedId" = :reqId)
  )`;

/** Clamp a caller-supplied limit into the supported range. */
export function clampRecoLimit(limit?: number): number {
  const n = Number(limit);
  if (!Number.isFinite(n) || n < 1) return RECO_DEFAULT_LIMIT;
  return Math.min(Math.floor(n), RECO_MAX_LIMIT);
}

/** Average equal-length vectors into a unit centroid; null when none valid. */
export function vectorCentroid(vectors: number[][]): number[] | null {
  const valid = vectors.filter((v) => Array.isArray(v) && v.length > 0);
  if (valid.length === 0) return null;
  const dims = valid[0].length;
  const sum = new Array<number>(dims).fill(0);
  let used = 0;
  for (const v of valid) {
    if (v.length !== dims) continue;
    for (let i = 0; i < dims; i++) sum[i] += v[i];
    used++;
  }
  if (used === 0) return null;
  let mag = 0;
  for (let i = 0; i < dims; i++) {
    sum[i] /= used;
    mag += sum[i] * sum[i];
  }
  mag = Math.sqrt(mag);
  if (mag === 0) return null;
  for (let i = 0; i < dims; i++) sum[i] /= mag;
  return sum;
}

/** Format a number[] as a pgvector literal: [a,b,c]. */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

/**
 * Maps a degree string to a numeric rank for comparison.
 * Higher rank = higher education level.
 */
export function normalizeDegree(degree: string): number {
  const d = (degree ?? '').toLowerCase();
  if (d.includes('phd') || d.includes('doctor')) return 5;
  if (d.includes('master')) return 4;
  if (
    d.includes('bachelor') ||
    d.includes('b.sc') ||
    d.includes('b.a') ||
    d.includes('undergraduate') ||
    d.includes('degree')
  )
    return 3;
  if (d.includes('associate') || d.includes('diploma')) return 2;
  if (d.includes('high school') || d.includes('secondary')) return 1;
  return 0;
}

/**
 * Extracts the first integer from an experience string like "3 years", "3-5 years", "5+ years".
 */
export function extractYears(text: string): number {
  if (!text) return 0;
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'have',
  'this',
  'from',
  'they',
  'will',
  'been',
  'more',
  'when',
  'also',
  'into',
  'than',
  'then',
  'some',
  'what',
  'which',
  'there',
  'their',
  'about',
  'would',
  'other',
  'after',
  'first',
  'well',
  'very',
  'even',
  'such',
  'most',
  'over',
  'your',
  'our',
]);

/**
 * Extracts meaningful keywords from a text — words longer than 3 chars, not stop words.
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
    ),
  ];
}
