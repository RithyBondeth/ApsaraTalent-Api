import { Company } from '@app/common/database/entities/company/company.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import {
  experienceLevelRank,
  isEmploymentType,
} from '@app/common/database/enums/experience-level.enum';
import { EWorkMode } from '@app/common/database/enums/work-mode.enum';
import {
  getJobSkillNames,
  skillOverlapRatio,
} from '@app/common/utils/skill.util';

/**
 * How much each dimension contributes to the overall match. Skills dominate
 * because that is what companies actually filter and reject on; location is
 * lowest because most of the platform's employers are in one city.
 *
 * These are relative, not absolute: a dimension neither side stated is dropped
 * and the rest are renormalized, so the weights only have to be right against
 * each other.
 */
export const MATCH_WEIGHTS = {
  skills: 40,
  experience: 20,
  employmentType: 15,
  workMode: 10,
  languages: 10,
  location: 5,
} as const;

export type TMatchDimensionKey = keyof typeof MATCH_WEIGHTS;

export interface IMatchDimension {
  key: TMatchDimensionKey;
  weight: number;
  /** 0–1. Only dimensions both sides stated appear here. */
  score: number;
}

export interface IMatchBreakdown {
  /** 0–100, or null when nothing at all could be compared. */
  score: number | null;
  dimensions: IMatchDimension[];
}

/* --------------------------------- Helpers --------------------------------- */
const normalize = (value: string | null | undefined) =>
  (value ?? '').trim().toLowerCase();

/**
 * How well a candidate's experience meets a requirement.
 *
 * Meeting or exceeding it scores full marks — a senior candidate is not a worse
 * fit for a mid role. Falling short degrades by level rather than failing
 * outright, because one band under is a conversation and three is not.
 */
function scoreExperience(
  candidate: string | null | undefined,
  required: string | null | undefined,
): number | null {
  const have = experienceLevelRank(candidate);
  const need = experienceLevelRank(required);
  if (have === null || need === null) return null;
  if (have >= need) return 1;
  return Math.max(0, 1 - (need - have) * 0.34);
}

/**
 * Work modes agree when they are equal, or when either side is flexible —
 * "flexible" exists precisely to mean "any of the others is fine".
 */
function scoreWorkMode(
  candidate: EWorkMode | null | undefined,
  required: EWorkMode | null | undefined,
): number | null {
  if (!candidate || !required) return null;
  if (candidate === EWorkMode.FLEXIBLE || required === EWorkMode.FLEXIBLE) {
    return 1;
  }
  return candidate === required ? 1 : 0;
}

function scoreExactText(
  candidate: string | null | undefined,
  required: string | null | undefined,
): number | null {
  const a = normalize(candidate);
  const b = normalize(required);
  if (!a || !b) return null;
  return a === b ? 1 : 0;
}

/**
 * Employment type only counts when both sides actually hold one.
 *
 * Rows predating the canonical list store things that were never employment
 * types — an `availability` of "available" describes when someone can start,
 * not what they want to be hired as. Scoring that against "full_time" would
 * read as a mismatch and cost the candidate the full weight of the dimension,
 * when in truth nothing comparable was ever stated. Dropping it instead is the
 * same treatment unrecognized experience values get.
 */
function scoreEmploymentType(
  candidate: string | null | undefined,
  required: string | null | undefined,
): number | null {
  if (!isEmploymentType(candidate) || !isEmploymentType(required)) return null;
  return scoreExactText(candidate, required);
}

/** Share of a role's required languages the candidate speaks. */
function scoreLanguages(
  candidate: string[] | null | undefined,
  required: string[] | null | undefined,
): number | null {
  const spoken = new Set((candidate ?? []).map(normalize).filter(Boolean));
  const wanted = (required ?? []).map(normalize).filter(Boolean);
  if (!spoken.size || !wanted.length) return null;
  return (
    wanted.filter((language) => spoken.has(language)).length / wanted.length
  );
}

/**
 * Location only matters when the role expects someone on site. A remote
 * position returns null so the dimension drops out rather than penalizing a
 * candidate for living elsewhere.
 */
function scoreLocation(
  employee: Employee,
  company: Company,
  job: Job,
): number | null {
  if (job.workMode === EWorkMode.REMOTE) return null;
  return scoreExactText(employee.location, job.location || company.location);
}

/**
 * Every dimension for one candidate against one position.
 * Nulls are dropped by the caller, which is what makes an unstated field
 * neutral rather than a zero.
 */
function scoreAgainstJob(
  employee: Employee,
  company: Company,
  job: Job,
): Partial<Record<TMatchDimensionKey, number | null>> {
  const employeeSkills = (employee.skills ?? [])
    .map((skill) => skill.name ?? '')
    .filter(Boolean);

  return {
    skills: skillOverlapRatio(employeeSkills, getJobSkillNames(job)),
    experience: scoreExperience(
      employee.yearsOfExperience,
      job.experienceRequired,
    ),
    employmentType: scoreEmploymentType(employee.availability, job.type),
    workMode: scoreWorkMode(employee.workMode, job.workMode),
    languages: scoreLanguages(employee.languages, job.languagesRequired),
    location: scoreLocation(employee, company, job),
  };
}

/* --------------------------------- Methods --------------------------------- */
/**
 * How well a candidate fits a company, as a 0–100 score with the per-dimension
 * detail that produced it.
 *
 * Scored against the candidate's best-fitting open position rather than an
 * average: a company with one perfect opening and four irrelevant ones is a
 * strong match, not a weak one.
 *
 * Dimensions neither side stated are excluded and the remaining weights
 * renormalized, so a sparsely filled job posting does not drag every candidate
 * down — it just gets judged on less. Null when nothing could be compared at
 * all, keeping "no data" distinct from a genuine zero.
 *
 * Pure: shared by the match-mutation and match-query services.
 */
export function computeMatchScore(
  employee: Employee,
  company: Company,
): IMatchBreakdown {
  const jobs = company.openPositions ?? [];
  if (!jobs.length) return { score: null, dimensions: [] };

  let best: IMatchBreakdown = { score: null, dimensions: [] };

  for (const job of jobs) {
    const scored = scoreAgainstJob(employee, company, job);

    const dimensions: IMatchDimension[] = [];
    let weighted = 0;
    let totalWeight = 0;

    for (const [key, weight] of Object.entries(MATCH_WEIGHTS) as [
      TMatchDimensionKey,
      number,
    ][]) {
      const score = scored[key];
      if (score === null || score === undefined) continue;
      dimensions.push({ key, weight, score });
      weighted += weight * score;
      totalWeight += weight;
    }

    if (!totalWeight) continue;

    const score = Math.round((weighted / totalWeight) * 100);
    if (best.score === null || score > best.score) {
      best = { score, dimensions };
    }
  }

  return best;
}

/**
 * Best-fit skill overlap between an employee and any of a company's open
 * positions, as a 0–100 percentage. Null when either side has nothing to
 * compare — no skills, no open positions, or no stated requirements — so an
 * absent score stays distinguishable from a genuine zero.
 *
 * Comparison is on the normalized skill name, so "Node.js" and "NodeJS" count
 * as the same skill rather than as a miss.
 *
 * Kept alongside `computeMatchScore` because it is persisted and surfaced on
 * its own as `skillScore` — the composite is reported separately rather than
 * silently redefining what that number has always meant.
 */
export function computeSkillScore(
  employee: Employee,
  company: Company,
): number | null {
  const employeeSkills = (employee.skills ?? [])
    .map((skill) => skill.name ?? '')
    .filter(Boolean);
  if (!employeeSkills.length) return null;

  const jobs = company.openPositions ?? [];
  if (!jobs.length) return null;

  let bestScore: number | null = null;
  for (const job of jobs) {
    const ratio = skillOverlapRatio(employeeSkills, getJobSkillNames(job));
    if (ratio === null) continue;
    if (bestScore === null || ratio > bestScore) bestScore = ratio;
  }

  return bestScore === null ? null : Math.round(bestScore * 100);
}
