import { Job } from '@app/common/database/entities/company/job.entity';
import { UserReport } from '@app/common/database/entities/moderation/user-report.entity';
import { EAdminAction } from '@app/common/database/enums/admin-action.enum';
import { EReportStatus } from '@app/common/database/enums/report-status.enum';
import { CacheInvalidationService } from '@app/common/redis/cache-invalidation.service';
import {
  AdminActionResponseDTO,
  AdminHideJobDTO,
  AdminJobListItemDTO,
  AdminListJobsDTO,
  AdminPagedJobsDTO,
  AdminRestoreJobDTO,
} from '@app/contracts/dtos/user';
import { IAdminJobService } from '@app/contracts/interfaces/service/user-service.interface';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { resolvePaging } from '../utils/admin-mapper.util';
import { AdminAuditService } from './admin-audit.service';

/**
 * Taking job postings down, and putting them back.
 *
 * The takedown itself is `softDelete`/`restore` on the Job repository, which
 * is what makes it reliable: `hiddenAt` is a `@DeleteDateColumn`, so TypeORM
 * removes the row from every read path — including the `company.openPositions`
 * joins that carry jobs onto company detail, both recommendation services and
 * the matching prompt — without any of them being changed.
 */
@Injectable()
export class AdminJobService implements IAdminJobService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(UserReport)
    private readonly reportRepo: Repository<UserReport>,
    private readonly auditService: AdminAuditService,
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AdminJobService.name);
  }

  async listJobs(
    adminListJobsDTO: AdminListJobsDTO,
  ): Promise<AdminPagedJobsDTO> {
    try {
      const { page, limit, skip } = resolvePaging(adminListJobsDTO);
      const { search, visibility = 'visible' } = adminListJobsDTO;

      const query = this.jobRepo
        .createQueryBuilder('job')
        .leftJoinAndSelect('job.company', 'company')
        .orderBy('job.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      // withDeleted lifts TypeORM's automatic filter so an admin can see the
      // postings they have taken down; without it this page could only ever
      // show live ones and a mistaken takedown would be unreachable.
      if (visibility !== 'visible') query.withDeleted();
      if (visibility === 'hidden') query.andWhere('job."hiddenAt" IS NOT NULL');

      if (search?.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        query.andWhere(
          `(LOWER(job.title) LIKE :term OR LOWER(COALESCE(company.name, '')) LIKE :term)`,
          { term },
        );
      }

      const [jobs, total] = await query.getManyAndCount();
      const reportCounts = await this.countOpenReportsForCompanies(
        jobs.map((job) => job.company?.user?.id).filter(Boolean) as string[],
      );

      return new AdminPagedJobsDTO({
        items: jobs.map(
          (job) =>
            new AdminJobListItemDTO({
              id: job.id,
              title: job.title,
              companyId: job.company?.id ?? null,
              companyName: job.company?.name || 'Unknown company',
              location: job.location ?? null,
              type: job.type,
              createdAt: job.createdAt,
              expireDate: job.expireDate ?? null,
              hiddenAt: job.hiddenAt ?? null,
              hiddenReason: job.hiddenReason ?? null,
              companyOpenReportCount:
                reportCounts.get(job.company?.user?.id ?? '') ?? 0,
            }),
        ),
        total,
        page,
        limit,
      });
    } catch (error) {
      this.logger.error((error as Error)?.message || 'Failed to list jobs.');
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while loading job postings.',
      });
    }
  }

  async hideJob(dto: AdminHideJobDTO): Promise<AdminActionResponseDTO> {
    try {
      const job = await this.loadJob(dto.jobId);

      if (job.hiddenAt) {
        return new AdminActionResponseDTO({
          message: 'That posting is already hidden.',
        });
      }

      // The reason and actor are written before the takedown, because
      // softDelete() only stamps hiddenAt — it does not carry our columns.
      await this.jobRepo.update(
        { id: job.id },
        { hiddenReason: dto.reason, hiddenBy: dto.actorId },
      );
      await this.jobRepo.softDelete(job.id);

      await this.auditService.record({
        actorId: dto.actorId,
        action: EAdminAction.JOB_HIDDEN,
        // Recorded against the company's User, so the account detail page
        // shows a takedown alongside the reports that prompted it.
        targetUserId: job.company?.user?.id ?? null,
        reason: dto.reason,
        metadata: {
          jobId: job.id,
          jobTitle: job.title,
          companyId: job.company?.id ?? null,
        },
      });

      await this.invalidateJobCaches(job.company?.id);

      return new AdminActionResponseDTO({
        message: `"${job.title}" is no longer visible to candidates.`,
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error((error as Error)?.message || 'Failed to hide job.');
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while hiding the posting.',
      });
    }
  }

  async restoreJob(dto: AdminRestoreJobDTO): Promise<AdminActionResponseDTO> {
    try {
      const job = await this.loadJob(dto.jobId);

      if (!job.hiddenAt) {
        return new AdminActionResponseDTO({
          message: 'That posting is already visible.',
        });
      }

      await this.jobRepo.restore(job.id);
      // Cleared on the way back, so a restored posting does not keep showing
      // the company a takedown notice for a decision that was reversed.
      await this.jobRepo.update(
        { id: job.id },
        { hiddenReason: null, hiddenBy: null },
      );

      await this.auditService.record({
        actorId: dto.actorId,
        action: EAdminAction.JOB_RESTORED,
        targetUserId: job.company?.user?.id ?? null,
        reason: job.hiddenReason,
        metadata: {
          jobId: job.id,
          jobTitle: job.title,
          companyId: job.company?.id ?? null,
        },
      });

      await this.invalidateJobCaches(job.company?.id);

      return new AdminActionResponseDTO({
        message: `"${job.title}" is visible to candidates again.`,
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error((error as Error)?.message || 'Failed to restore job.');
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while restoring the posting.',
      });
    }
  }

  /**
   * withDeleted, always: both actions have to find a posting whichever side of
   * the line it is on, or restoring would 404 on exactly the rows it exists
   * to reach.
   *
   * A query builder rather than `findOne({ relations })`, and that is not a
   * style choice. This repo sets `relationLoadStrategy: 'query'`, which loads
   * relations in a second query — and for a soft-deleted row that second query
   * comes back empty even under `withDeleted`. The symptom was silent and
   * one-directional: hiding captured the company fine (the row was still
   * live when it was read), restoring did not, so `restoreJob` skipped its
   * cache invalidation and audited a takedown reversal with no company
   * attached. A restored posting stayed invisible until the TTL expired.
   *
   * An explicit join resolves the company on a hidden row, verified against
   * this schema before the change.
   */
  private async loadJob(jobId: string): Promise<Job> {
    const job = await this.jobRepo
      .createQueryBuilder('job')
      .withDeleted()
      .leftJoinAndSelect('job.company', 'company')
      .leftJoinAndSelect('company.user', 'user')
      .where('job.id = :jobId', { jobId })
      .getOne();

    if (!job) {
      throw new RpcException({
        statusCode: 404,
        message: 'That job posting does not exist.',
      });
    }
    return job;
  }

  /**
   * Hiding a posting changes the same caches as a company adding or removing
   * one, so it reuses the same invalidation `open-position.service.ts` calls
   * rather than assembling its own set.
   *
   * That is not tidiness. A hand-rolled set here cleared `company:detail` and
   * the list pages but not `user:detail`, and `user.service.ts` embeds
   * `openPositions` in the user payload too — so a restored posting stayed
   * invisible on company detail until the TTL expired, which the end-to-end
   * run caught. One caller, one definition of "this company's jobs changed".
   */
  private async invalidateJobCaches(companyId?: string): Promise<void> {
    if (!companyId) return;
    await this.cacheInvalidationService.invalidateCompanyCache(companyId);
  }

  private async countOpenReportsForCompanies(
    userIds: string[],
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();

    const rows = await this.reportRepo
      .createQueryBuilder('report')
      .select('report."reportedId"', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('report."reportedId" IN (:...userIds)', { userIds })
      .andWhere('report.status = :status', { status: EReportStatus.PENDING })
      .groupBy('report."reportedId"')
      .getRawMany<{ userId: string; count: string }>();

    return new Map(rows.map((row) => [row.userId, Number(row.count)]));
  }
}
