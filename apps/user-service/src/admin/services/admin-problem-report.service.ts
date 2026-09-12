import { EAdminAction } from '@app/common/database/enums/admin-action.enum';
import { ProblemReport } from '@app/common/database/entities/problem-report.entity';
import {
  AdminActionResponseDTO,
  AdminListProblemReportsDTO,
  AdminPagedProblemReportsDTO,
  AdminProblemReportDTO,
  AdminProblemReportReporterDTO,
  AdminUpdateProblemReportStatusDTO,
} from '@app/contracts/dtos/user';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { resolvePaging } from '../utils/admin-mapper.util';
import { AdminAuditService } from './admin-audit.service';

const toAdminProblemReport = (report: ProblemReport): AdminProblemReportDTO =>
  new AdminProblemReportDTO({
    id: report.id,
    category: report.category,
    details: report.details,
    pageUrl: report.pageUrl,
    userAgent: report.userAgent,
    status: report.status,
    resolutionNote: report.resolutionNote,
    createdAt: report.createdAt,
    // Null when the reporter's account has been deleted since — the FK is
    // SET NULL on purpose so the report survives.
    reporter: report.reporter
      ? new AdminProblemReportReporterDTO({
          id: report.reporter.id,
          email: report.reporter.email,
          role: report.reporter.role,
        })
      : null,
  });

/**
 * Admin queue for problem reports submitted through the support form.
 *
 * Separate from `AdminReportService` because the two flows share nothing but
 * the word "report" — user reports are *about someone* (moderation), problem
 * reports are *about the page* (support). A single service class holding both
 * would branch on kind at every method.
 *
 * Audit rows use the existing `EAdminAction.REPORT_STATUS_CHANGED` label with
 * `metadata.reportKind = 'problem_report'`, so the audit log has one column
 * and the reader disambiguates. Adding a new enum value would have been a
 * Postgres `ALTER TYPE ADD VALUE`, which per migrations/irreversible.json is
 * a rollback we cannot take back.
 */
@Injectable()
export class AdminProblemReportService {
  constructor(
    @InjectRepository(ProblemReport)
    private readonly reportRepo: Repository<ProblemReport>,
    private readonly auditService: AdminAuditService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AdminProblemReportService.name);
  }

  async listReports(
    dto: AdminListProblemReportsDTO,
  ): Promise<AdminPagedProblemReportsDTO> {
    try {
      const { page, limit, skip } = resolvePaging(dto);

      const [reports, total] = await this.reportRepo.findAndCount({
        where: {
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.category ? { category: dto.category } : {}),
        },
        relations: ['reporter'],
        // Oldest first — the report that has waited longest is the one that
        // should be looked at next, same as the moderation queue.
        order: { createdAt: 'ASC' },
        skip,
        take: limit,
      });

      return new AdminPagedProblemReportsDTO({
        items: reports.map(toAdminProblemReport),
        total,
        page,
        limit,
      });
    } catch (error) {
      this.logger.error(
        (error as Error)?.message || 'Failed to list problem reports.',
      );
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while loading problem reports.',
      });
    }
  }

  async updateStatus(
    dto: AdminUpdateProblemReportStatusDTO,
  ): Promise<AdminActionResponseDTO> {
    try {
      const report = await this.reportRepo.findOne({
        where: { id: dto.reportId },
        relations: ['reporter'],
      });
      if (!report) {
        throw new RpcException({
          statusCode: 404,
          message: 'That problem report does not exist.',
        });
      }

      if (report.status === dto.status) {
        return new AdminActionResponseDTO({
          message: `Report is already ${dto.status}.`,
        });
      }

      const previousStatus = report.status;
      await this.reportRepo.update(
        { id: report.id },
        {
          status: dto.status,
          // The note is authoritative on the row so triage does not have to
          // join the audit log to see the last decision. It is also copied
          // into the audit entry below for the historical trail.
          resolutionNote: dto.note ?? null,
        },
      );

      await this.auditService.record({
        actorId: dto.actorId,
        action: EAdminAction.REPORT_STATUS_CHANGED,
        // No `targetUserId` for a problem report: it is about the page, not
        // about a person. The reporter is *not* the target of the action.
        targetUserId: null,
        targetReportId: report.id,
        reason: dto.note ?? null,
        metadata: {
          reportKind: 'problem_report',
          from: previousStatus,
          to: dto.status,
        },
      });

      return new AdminActionResponseDTO({
        message: `Report marked ${dto.status}.`,
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(
        (error as Error)?.message || 'Failed to update problem report.',
      );
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while updating the report.',
      });
    }
  }
}
