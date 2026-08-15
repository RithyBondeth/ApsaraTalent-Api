/**
 * The canonical experience scale, shared by both sides of a match.
 *
 * `employee."yearsOfExperience"` and `job."experienceRequired"` both hold one
 * of these exact strings — the NormalizeExperienceLevels migration enforced it
 * for existing rows, and both signup forms now pick from this list. The job
 * search filter compares them with `=`, so the strings must stay byte-identical
 * wherever they are produced.
 */
export const EXPERIENCE_LEVELS = [
  'No Experience',
  'Less than 1 year',
  '1 - 2 years',
  '3 - 5 years',
  '6 - 10 years',
  '10+ years',
] as const;

export type TExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/**
 * Position of a level on the scale, or null when the value is not one of the
 * canonical strings (legacy free text that normalization could not map).
 *
 * Matches the ordering used by the employee search sort, which ranks the same
 * six values 0–5 in SQL.
 */
export function experienceLevelRank(
  value: string | null | undefined,
): number | null {
  if (!value) return null;
  const index = EXPERIENCE_LEVELS.indexOf(value.trim() as TExperienceLevel);
  return index === -1 ? null : index;
}

/**
 * The canonical employment types, shared by `employee."availability"` and
 * `job."type"`. Same contract as the experience scale: the search filters
 * compare these by exact equality, so the strings must match byte for byte.
 */
export const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'internship',
  'contract',
  'freelance',
] as const;

export type TEmploymentType = (typeof EMPLOYMENT_TYPES)[number];

/**
 * True when the value is one of the canonical employment types.
 *
 * Older rows hold things that were never employment types at all — an
 * `availability` of "available" or "Immediately" describes when someone can
 * start, not what they want to be hired as. Those are unreadable rather than
 * mismatched, and callers use this to tell the two apart.
 */
export function isEmploymentType(
  value: string | null | undefined,
): value is TEmploymentType {
  if (!value) return false;
  return (EMPLOYMENT_TYPES as readonly string[]).includes(value.trim());
}
