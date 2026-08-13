import { Company } from '@app/common/database/entities/company/company.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';

/**
 * Best-fit skill overlap between an employee and any of a company's open
 * positions, as a 0–100 percentage. Null when either side has nothing to
 * compare — no skills, no open positions, or no stated requirements — so an
 * absent score stays distinguishable from a genuine zero.
 *
 * Pure: shared by the match-mutation and match-query services.
 */
export function computeSkillScore(
  employee: Employee,
  company: Company,
): number | null {
  const employeeSkills = (employee.skills ?? [])
    .map((s) => (s.name ?? '').toLowerCase().trim())
    .filter(Boolean);
  if (!employeeSkills.length) return null;

  const jobs = company.openPositions ?? [];
  if (!jobs.length) return null;

  let bestScore = 0;
  for (const job of jobs) {
    if (!job.skillsRequired) continue;
    const required = job.skillsRequired
      .split(',')
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean);
    if (!required.length) continue;
    const matched = required.filter((r) => employeeSkills.includes(r)).length;
    const score = matched / required.length;
    if (score > bestScore) bestScore = score;
  }

  return Math.round(bestScore * 100);
}
