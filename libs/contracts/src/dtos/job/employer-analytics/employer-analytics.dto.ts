import { EApplicationStatus } from '@app/common/database/enums/application-status.enum';

/**
 * One bar of the recruiting funnel — a stage plus how many applications
 * currently sit in it. Terminal stages are included so the funnel can show
 * "→ 12 hired, 40 rejected" alongside the live stages, which is a more
 * honest picture than a chart that stops at OFFERED.
 */
export class EmployerFunnelStageDTO {
  status: EApplicationStatus;
  count: number;

  constructor(partial: Partial<EmployerFunnelStageDTO>) {
    Object.assign(this, partial);
  }
}

/**
 * One row of the top-jobs list: total applicants for a job, plus a small
 * breakdown so the recruiter can spot a job that has lots of applicants but
 * nobody moving through it (a broken filter, an over-tight description).
 */
export class TopJobDTO {
  jobId: string;
  title: string;
  totalApplicants: number;
  activePipeline: number;
  hired: number;
  rejected: number;

  constructor(partial: Partial<TopJobDTO>) {
    Object.assign(this, partial);
  }
}

/**
 * A period-over-period delta. `current` is the last N days, `previous` is
 * the N days before that; `delta` is `current - previous`. The client uses
 * the sign for the chip colour and the magnitude for the number itself.
 */
export class TimeWindowDeltaDTO {
  current: number;
  previous: number;
  delta: number;

  constructor(partial: Partial<TimeWindowDeltaDTO>) {
    Object.assign(this, partial);
  }
}

export class EmployerAnalyticsResponseDTO {
  /** Jobs the company currently has posted (not hidden or expired). */
  openPositions: number;
  /**
   * Applications sitting in a stage the recruiter is still working — the
   * live pipeline as defined by the ATS board, excluding terminal states
   * and withdrawals.
   */
  activePipeline: number;
  /** Hires in the last 30 days. */
  hired30d: number;
  /** Rejections in the last 30 days. */
  rejected30d: number;

  /** Total applications received, current vs prior 30-day window. */
  applicationsDelta: TimeWindowDeltaDTO;

  /**
   * Median days between the applicant arriving (`appliedAt`) and the
   * company first moving them off PENDING. A ballpark of how responsive
   * the recruiter side is — null when the company has no moved rows yet.
   */
  medianDaysToFirstMove: number | null;

  /**
   * All applications for the company bucketed by stage. Includes terminal
   * stages so the funnel view can render the whole flow, not just the live
   * portion.
   */
  funnel: EmployerFunnelStageDTO[];

  /**
   * The company's jobs ordered by applicant volume, capped at a small N. A
   * job with zero applicants is included so a slow job stands out rather
   * than silently disappearing from the list.
   */
  topJobs: TopJobDTO[];

  constructor(partial: Partial<EmployerAnalyticsResponseDTO>) {
    Object.assign(this, partial);
  }
}
