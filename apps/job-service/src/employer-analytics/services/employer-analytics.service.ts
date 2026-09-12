import { Application } from '@app/common/database/entities/application.entity';
import { ApplicationStatusHistory } from '@app/common/database/entities/application-status-history.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import {
  APPLICATION_STATUS_TRANSITIONS,
  EApplicationStatus,
} from '@app/common/database/enums/application-status.enum';
import {
  EmployerAnalyticsResponseDTO,
  EmployerFunnelStageDTO,
  IEmployerAnalyticsService,
  TimeWindowDeltaDTO,
  TopJobDTO,
} from '@app/contracts';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Between, IsNull, MoreThan, Or, Repository } from 'typeorm';

/** How many jobs the top-jobs list carries. Small enough to stay a dashboard
 *  glance, big enough to include the "why is this one dead" outliers. */
const TOP_JOBS_LIMIT = 5;

/**
 * The stages the funnel renders, in the order they appear on the board plus
 * the two end-states. WITHDRAWN and the legacy REVIEWED are omitted — a
 * candidate who withdrew is not a signal about the company's funnel, and
 * REVIEWED is a stage nothing transitions into any more.
 */
const FUNNEL_ORDER: EApplicationStatus[] = [
  EApplicationStatus.PENDING,
  EApplicationStatus.SHORTLISTED,
  EApplicationStatus.INTERVIEWING,
  EApplicationStatus.OFFERED,
  EApplicationStatus.HIRED,
  EApplicationStatus.REJECTED,
];

/**
 * Stages the ATS board considers "live pipeline" — the same list the kanban
 * columns use. Everything the recruiter is currently working belongs to one
 * of these.
 */
const ACTIVE_STAGES: EApplicationStatus[] = [
  EApplicationStatus.PENDING,
  EApplicationStatus.SHORTLISTED,
  EApplicationStatus.INTERVIEWING,
  EApplicationStatus.OFFERED,
];

@Injectable()
export class EmployerAnalyticsService implements IEmployerAnalyticsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly historyRepo: Repository<ApplicationStatusHistory>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EmployerAnalyticsService.name);
  }

  async getAnalytics(companyId: string): Promise<EmployerAnalyticsResponseDTO> {
    try {
      const company = await this.companyRepo.findOne({
        where: { id: companyId },
        select: { id: true },
      });
      if (!company) {
        throw new RpcException({
          statusCode: 404,
          message: 'Company not found',
        });
      }

      const now = Date.now();
      const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

      const [
        openPositions,
        activePipeline,
        hired30d,
        rejected30d,
        applicationsCurrent,
        applicationsPrevious,
        funnel,
        topJobs,
        medianDaysToFirstMove,
      ] = await Promise.all([
        this.countOpenPositions(companyId),
        this.countActivePipeline(companyId),
        this.countByStatusSince(
          companyId,
          [EApplicationStatus.HIRED],
          monthAgo,
        ),
        this.countByStatusSince(
          companyId,
          [EApplicationStatus.REJECTED],
          monthAgo,
        ),
        this.applicationRepo.count({
          where: {
            job: { company: { id: companyId } },
            appliedAt: MoreThan(monthAgo),
          },
        }),
        this.applicationRepo.count({
          where: {
            job: { company: { id: companyId } },
            appliedAt: Between(twoMonthsAgo, monthAgo),
          },
        }),
        this.buildFunnel(companyId),
        this.buildTopJobs(companyId),
        this.medianDaysFromApplyToFirstMove(companyId),
      ]);

      return new EmployerAnalyticsResponseDTO({
        openPositions,
        activePipeline,
        hired30d,
        rejected30d,
        applicationsDelta: new TimeWindowDeltaDTO({
          current: applicationsCurrent,
          previous: applicationsPrevious,
          delta: applicationsCurrent - applicationsPrevious,
        }),
        medianDaysToFirstMove,
        funnel,
        topJobs,
      });
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Failed to load employer analytics',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  /**
   * A job is "open" when it exists (the soft-delete for moderation is
   * already filtered by TypeORM's default query) and either has no expiry
   * or expires in the future. The company's own hard-deleted rows are
   * gone; taken-down rows are hidden from this count by design.
   */
  private async countOpenPositions(companyId: string): Promise<number> {
    return this.jobRepo.count({
      where: {
        company: { id: companyId },
        expireDate: Or(IsNull(), MoreThan(new Date())),
      },
    });
  }

  private async countActivePipeline(companyId: string): Promise<number> {
    // A single query counts every active-stage row for the company; more
    // efficient than four .count() calls or a per-stage loop.
    return this.applicationRepo
      .createQueryBuilder('a')
      .innerJoin('a.job', 'j')
      .where('j."companyId" = :companyId', { companyId })
      .andWhere('a.status IN (:...stages)', { stages: ACTIVE_STAGES })
      .getCount();
  }

  private async countByStatusSince(
    companyId: string,
    statuses: EApplicationStatus[],
    since: Date,
  ): Promise<number> {
    // `statusChangedAt` is when the row entered its current status. For
    // "hired/rejected in the last N days" that is exactly the question —
    // an application from six months ago that was hired yesterday still
    // counts, and one hired six months ago does not.
    return this.applicationRepo
      .createQueryBuilder('a')
      .innerJoin('a.job', 'j')
      .where('j."companyId" = :companyId', { companyId })
      .andWhere('a.status IN (:...statuses)', { statuses })
      .andWhere('a."statusChangedAt" IS NOT NULL')
      .andWhere('a."statusChangedAt" > :since', { since })
      .getCount();
  }

  private async buildFunnel(
    companyId: string,
  ): Promise<EmployerFunnelStageDTO[]> {
    // GROUP BY status once so we do not fan out into six count() calls; then
    // map the returned rows into `FUNNEL_ORDER` so a stage with zero rows
    // still appears in the response.
    const rows = await this.applicationRepo
      .createQueryBuilder('a')
      .innerJoin('a.job', 'j')
      .select('a.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('j."companyId" = :companyId', { companyId })
      .groupBy('a.status')
      .getRawMany<{ status: EApplicationStatus; count: number }>();

    const byStatus = new Map(rows.map((row) => [row.status, row.count]));

    // Deliberately assert stages beyond APPLICATION_STATUS_TRANSITIONS's keys
    // exist so a future enum add-a-value does not silently produce a bar with
    // zero count and no label. The `Object.keys(...)` reads the runtime map;
    // this comment is what future readers see if they add a value.
    void APPLICATION_STATUS_TRANSITIONS;

    return FUNNEL_ORDER.map(
      (status) =>
        new EmployerFunnelStageDTO({
          status,
          count: byStatus.get(status) ?? 0,
        }),
    );
  }

  private async buildTopJobs(companyId: string): Promise<TopJobDTO[]> {
    // The top-jobs card shows applicant volume per job, plus a small breakdown
    // so a "high volume, nothing moving" job stands out. All four columns are
    // computed in one query with FILTER clauses rather than four subqueries.
    // A LEFT JOIN keeps a zero-applicant job on the list.
    const rows = await this.jobRepo
      .createQueryBuilder('j')
      .leftJoin('application', 'a', 'a."jobId" = j.id')
      .select('j.id', 'jobId')
      .addSelect('j.title', 'title')
      .addSelect('COUNT(a.id)::int', 'totalApplicants')
      .addSelect(
        `COUNT(a.id) FILTER (WHERE a.status IN ('${ACTIVE_STAGES.join(
          "','",
        )}'))::int`,
        'activePipeline',
      )
      .addSelect(
        `COUNT(a.id) FILTER (WHERE a.status = '${EApplicationStatus.HIRED}')::int`,
        'hired',
      )
      .addSelect(
        `COUNT(a.id) FILTER (WHERE a.status = '${EApplicationStatus.REJECTED}')::int`,
        'rejected',
      )
      .where('j."companyId" = :companyId', { companyId })
      .groupBy('j.id')
      .addGroupBy('j.title')
      .orderBy('"totalApplicants"', 'DESC')
      .addOrderBy('j.title', 'ASC')
      .limit(TOP_JOBS_LIMIT)
      .getRawMany<{
        jobId: string;
        title: string;
        totalApplicants: number;
        activePipeline: number;
        hired: number;
        rejected: number;
      }>();

    return rows.map(
      (row) =>
        new TopJobDTO({
          jobId: row.jobId,
          title: row.title,
          totalApplicants: row.totalApplicants,
          activePipeline: row.activePipeline,
          hired: row.hired,
          rejected: row.rejected,
        }),
    );
  }

  /**
   * Median of (first-move-time − appliedAt) across every application whose
   * company has moved it off PENDING. Reads the status-history table for
   * the earliest non-null `from` per application — that first transition is
   * always "company moved this row for the first time".
   *
   * Kept as a raw SQL for the percentile: `percentile_cont(0.5)` is the
   * standard pg approach and beats loading rows into node just to sort them.
   */
  private async medianDaysFromApplyToFirstMove(
    companyId: string,
  ): Promise<number | null> {
    const rows = await this.historyRepo.query(
      `
      WITH first_move AS (
        SELECT
          h."applicationId" AS application_id,
          MIN(h."createdAt") AS first_moved_at
        FROM "application_status_history" h
        WHERE h."from" IS NOT NULL
        GROUP BY h."applicationId"
      )
      SELECT percentile_cont(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (fm.first_moved_at - a."appliedAt")) / 86400
      )::float AS median_days
      FROM first_move fm
      JOIN "application" a ON a.id = fm.application_id
      JOIN "job" j ON j.id = a."jobId"
      WHERE j."companyId" = $1
      `,
      [companyId],
    );
    const median = rows[0]?.median_days;
    if (median === null || median === undefined) return null;
    // pg `percentile_cont` returns a double precision; round to one decimal
    // so the card reads "1.2 days" rather than "1.1666666666666667".
    return Math.round(Number(median) * 10) / 10;
  }
}
