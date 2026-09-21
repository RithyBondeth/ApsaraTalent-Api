export enum EApplicationStatus {
  PENDING = 'pending',
  /**
   * Legacy. Kept because Postgres cannot remove an enum label and rows may
   * already carry it — but no longer reachable through a transition, because
   * nobody ever clicked "I have looked at this". The question it tried to
   * answer is now answered by `Application.reviewedAt`, which the applicant
   * list stamps on its own.
   */
  REVIEWED = 'reviewed',
  SHORTLISTED = 'shortlisted',
  INTERVIEWING = 'interviewing',
  OFFERED = 'offered',
  REJECTED = 'rejected',
  HIRED = 'hired',
  WITHDRAWN = 'withdrawn',
}

/**
 * Maps each status to the set a **company** may move it into, mirroring
 * `VALID_STATUS_TRANSITIONS` for interviews.
 *
 * Without this the pipeline is five free-floating labels: `updateApplicationStatus`
 * accepted any enum value from any other, so a rejected candidate could be moved
 * back to pending and a hired one to rejected, with nothing recording that it
 * happened. Every stage can still end in REJECTED — that is the one edge a
 * company can always take.
 *
 * WITHDRAWN is absent from every list on purpose: it is the employee's to set,
 * through `withdrawApplication`, not a stage a company can push someone into.
 */
export const APPLICATION_STATUS_TRANSITIONS: Record<
  EApplicationStatus,
  EApplicationStatus[]
> = {
  [EApplicationStatus.PENDING]: [
    EApplicationStatus.SHORTLISTED,
    EApplicationStatus.REJECTED,
  ],
  [EApplicationStatus.REVIEWED]: [
    EApplicationStatus.SHORTLISTED,
    EApplicationStatus.REJECTED,
  ],
  [EApplicationStatus.SHORTLISTED]: [
    EApplicationStatus.INTERVIEWING,
    EApplicationStatus.REJECTED,
  ],
  [EApplicationStatus.INTERVIEWING]: [
    EApplicationStatus.OFFERED,
    EApplicationStatus.REJECTED,
  ],
  [EApplicationStatus.OFFERED]: [
    EApplicationStatus.HIRED,
    EApplicationStatus.REJECTED,
  ],
  [EApplicationStatus.HIRED]: [],
  [EApplicationStatus.REJECTED]: [],
  [EApplicationStatus.WITHDRAWN]: [],
};

/**
 * Statuses an employee may still withdraw from — everything that has not
 * already reached an end. HIRED, REJECTED and WITHDRAWN are terminal.
 */
export const WITHDRAWABLE_APPLICATION_STATUSES: EApplicationStatus[] = [
  EApplicationStatus.PENDING,
  EApplicationStatus.REVIEWED,
  EApplicationStatus.SHORTLISTED,
  EApplicationStatus.INTERVIEWING,
  EApplicationStatus.OFFERED,
];
