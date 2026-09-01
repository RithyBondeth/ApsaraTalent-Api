/**
 * Keyword relevance scoring for the job and employee search.
 *
 * Both searches used to treat a keyword as a pure yes/no filter and then order
 * by `createdAt DESC`. A posting whose title is exactly what you searched for
 * ranked below an unrelated one posted an hour later that happened to mention
 * the word once in its description.
 *
 * The score is a weighted sum of where the keyword hit, strongest field first,
 * with a trigram similarity on the primary field as a fine-grained tiebreak so
 * near-misses ('Backend Developer' for 'Backend Devloper') still sort sensibly.
 * Deterministic and cheap: every term reuses a pg_trgm index that already
 * exists for the equivalent ILIKE filter.
 */

/** Sort key that means "order by keyword relevance". */
export const RELEVANCE_SORT = 'relevance';

/** Weights, highest first. Gaps are wide enough that a stronger field always wins. */
const WEIGHT_PRIMARY_EXACT = 100;
const WEIGHT_PRIMARY_PREFIX = 50;
const WEIGHT_PRIMARY_CONTAINS = 25;
const WEIGHT_SECONDARY = 10;
const WEIGHT_TERTIARY = 4;

export interface RelevanceFields {
  /** The field a searcher is really naming — job title, or an employee's role. */
  primary: string;
  /** Supporting fields: skills, names. Worth less than the primary. */
  secondary?: string[];
  /** Weakest evidence, typically a long description. */
  tertiary?: string[];
}

/**
 * Build the SQL scoring expression.
 *
 * Column names are interpolated, so pass only literal identifiers from the
 * query builder — never user input. The keyword itself is bound through the
 * named parameters `relevanceExact`, `relevancePrefix`, `relevanceLike` and
 * `relevanceRaw`, which the caller must supply via `relevanceParams`.
 */
export function relevanceScoreSql(fields: RelevanceFields): string {
  const terms: string[] = [
    `CASE WHEN ${fields.primary} ILIKE :relevanceExact THEN ${WEIGHT_PRIMARY_EXACT} ELSE 0 END`,
    `CASE WHEN ${fields.primary} ILIKE :relevancePrefix THEN ${WEIGHT_PRIMARY_PREFIX} ELSE 0 END`,
    `CASE WHEN ${fields.primary} ILIKE :relevanceLike THEN ${WEIGHT_PRIMARY_CONTAINS} ELSE 0 END`,
  ];

  for (const column of fields.secondary ?? []) {
    terms.push(
      `CASE WHEN ${column} ILIKE :relevanceLike THEN ${WEIGHT_SECONDARY} ELSE 0 END`,
    );
  }
  for (const column of fields.tertiary ?? []) {
    terms.push(
      `CASE WHEN ${column} ILIKE :relevanceLike THEN ${WEIGHT_TERTIARY} ELSE 0 END`,
    );
  }

  // Sub-1 tiebreak, so it only separates rows the weights above tied.
  terms.push(`similarity(COALESCE(${fields.primary}, ''), :relevanceRaw)`);

  return `(${terms.join(' + ')})`;
}

/** Bound parameters that `relevanceScoreSql` expects. */
export function relevanceParams(keyword: string): Record<string, string> {
  const trimmed = keyword.trim();
  return {
    relevanceExact: trimmed,
    relevancePrefix: `${trimmed}%`,
    relevanceLike: `%${trimmed}%`,
    relevanceRaw: trimmed,
  };
}
