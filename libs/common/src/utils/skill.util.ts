import { Job } from '../database/entities/company/job.entity';

/**
 * Skill handling shared by matching, recommendations, and the response DTOs.
 *
 * A job's required skills live in two places during the expand/contract
 * migration onto the `Skill` entity: the `skills` relation, and the legacy
 * comma-joined `skillsRequired` column that still gets written alongside it.
 * Every reader goes through `getJobSkillNames` so neither storage is read
 * directly, and so a query that did not request the relation degrades to the
 * string instead of silently reporting a job with no requirements.
 */

/**
 * Reduces a skill name to its comparable form: lowercase, with punctuation and
 * whitespace stripped. Makes "Node.js", "node js" and "NodeJS" the same skill,
 * which plain lowercasing does not.
 */
export function normalizeSkillName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#]/g, '');
}

/**
 * Splits the legacy comma-joined column into trimmed, non-empty names.
 */
export function parseSkillList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);
}

/**
 * A job's required skills as display names, preferring the `skills` relation
 * and falling back to the legacy column when it was not loaded or is empty.
 */
export function getJobSkillNames(
  job: Pick<Job, 'skillsRequired'> & {
    requiredSkills?: { name: string }[] | null;
  },
): string[] {
  const related = (job.requiredSkills ?? [])
    .map((skill) => skill?.name?.trim())
    .filter((name): name is string => Boolean(name));

  return related.length ? related : parseSkillList(job.skillsRequired);
}

/**
 * Overlap between what a candidate has and what a role asks for, as a 0–1
 * ratio of the role's requirements that are met. Returns null when either side
 * has nothing to compare, so "no data" stays distinct from a genuine zero.
 */
export function skillOverlapRatio(
  candidateSkills: string[],
  requiredSkills: string[],
): number | null {
  const candidate = new Set(
    candidateSkills.map(normalizeSkillName).filter(Boolean),
  );
  const required = requiredSkills.map(normalizeSkillName).filter(Boolean);

  if (!candidate.size || !required.length) return null;

  const matched = required.filter((skill) => candidate.has(skill)).length;
  return matched / required.length;
}
