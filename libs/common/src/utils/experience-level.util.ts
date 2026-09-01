/**
 * Experience levels are free text, on both sides of the match.
 *
 * The UI offers a fixed ladder ('No Experience' … '10+ years'), but the columns
 * behind it were never constrained to it. Live data holds '3 years', '5',
 * '1+ years', '4+ years' — none of which equal any option the UI can produce.
 * The search filters compared these with `=`, so selecting an experience level
 * matched zero rows every time, on both the job and the employee side.
 *
 * Rather than migrate two columns of unconstrained text (and whatever the next
 * client writes into them), searching parses both sides to a number of years
 * and compares numerically. Anything unparseable — 'No Experience', '', junk —
 * reads as 0, which is the honest interpretation of "no stated experience".
 */

/** Lower and upper bound, in years, of a UI experience option. */
export interface ExperienceRange {
  min: number;
  max: number;
}

/** Stands in for "no upper bound" in the open-ended '10+ years' option. */
export const EXPERIENCE_UNBOUNDED = 99;

/**
 * Parse a UI experience label into the range of years it covers.
 *
 * Handles the canonical ladder plus the shapes that reach us from older
 * clients and seed data: '5', '5 years', '3+ years', '3 - 5 years'.
 * Returns null when the value carries no filterable meaning ('All', '', null),
 * so callers can skip the filter entirely rather than apply a meaningless one.
 */
export function parseExperienceRange(
  value: string | null | undefined,
): ExperienceRange | null {
  if (!value) return null;

  const text = value.trim();
  if (text === '' || text.toLowerCase() === 'all') return null;

  // 'No Experience' / 'Less than 1 year' — both mean zero completed years.
  if (/no\s+experience/i.test(text)) return { min: 0, max: 0 };
  if (/less\s+than\s+1/i.test(text)) return { min: 0, max: 0 };

  const numbers = text.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length === 0) return null;

  // '3 - 5 years'
  if (numbers.length >= 2) {
    return { min: numbers[0], max: numbers[1] };
  }

  // '10+ years' / '3+ years' — open ended above the stated figure.
  if (/\+/.test(text)) {
    return { min: numbers[0], max: EXPERIENCE_UNBOUNDED };
  }

  // '5' / '5 years' — a single point on the ladder.
  return { min: numbers[0], max: numbers[0] };
}

/**
 * SQL expression yielding the number of years held in a free-text column.
 *
 * Reads the first run of digits and falls back to 0, so 'No Experience', NULL
 * and unparseable junk all compare as zero rather than dropping the row.
 * `column` is interpolated, so pass only a literal identifier from the query
 * builder — never user input.
 */
export function experienceYearsSql(column: string): string {
  return `COALESCE(NULLIF(substring(${column} from '[0-9]+'), '')::int, 0)`;
}
