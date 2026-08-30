import { AdminAuditLog } from '@app/common/database/entities/moderation/admin-audit-log.entity';
import { UserReport } from '@app/common/database/entities/moderation/user-report.entity';
import { EAdminAction } from '@app/common/database/enums/admin-action.enum';
import {
  AdminActionResponseDTO,
  AdminAuditEntryDTO,
  AdminListAuditDTO,
  AdminListReportsDTO,
  AdminPagedAuditDTO,
  AdminPagedReportsDTO,
  AdminUpdateReportStatusDTO,
} from '@app/contracts/dtos/user';
import { IAdminReportService } from '@app/contracts/interfaces/service/user-service.interface';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { resolvePaging, toAdminReport } from '../utils/admin-mapper.util';
import { AdminAuditService } from './admin-audit.service';

/**
 * The report queue, and the audit trail over it.
 *
 * `UserReport.status` has existed since the moderation feature shipped and had
 * no writer: every report ever filed sat at PENDING forever. This service is
 * that writer.
 */
@Injectable()
export class AdminReportService implements IAdminReportService {
  constructor(
    @InjectRepository(UserReport)
    private readonly reportRepo: Repository<UserReport>,
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
    private readonly auditService: AdminAuditService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AdminReportService.name);
  }

  async listReports(
    adminListReportsDTO: AdminListReportsDTO,
  ): Promise<AdminPagedReportsDTO> {
    try {
      const { page, limit, skip } = resolvePaging(adminListReportsDTO);

      const [reports, total] = await this.reportRepo.findAndCount({
        where: adminListReportsDTO.status
          ? { status: adminListReportsDTO.status }
          : {},
        relations: [
          'reporter',
          'reporter.employee',
          'reporter.company',
          'reported',
          'reported.employee',
          'reported.company',
        ],
        // Oldest first: this is a work queue, and the report that has waited
        // longest is the one that should be looked at next.
        order: { createdAt: 'ASC' },
        skip,
        take: limit,
      });

      return new AdminPagedReportsDTO({
        items: reports.map(toAdminReport),
        total,
        page,
        limit,
      });
    } catch (error) {
      this.logger.error((error as Error)?.message || 'Failed to list reports.');
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while loading reports.',
      });
    }
  }

  async updateReportStatus(
    dto: AdminUpdateReportStatusDTO,
  ): Promise<AdminActionResponseDTO> {
    try {
      const report = await this.reportRepo.findOne({
        where: { id: dto.reportId },
        relations: ['reported'],
      });

      if (!report) {
        throw new RpcException({
          statusCode: 404,
          message: 'That report does not exist.',
        });
      }

      if (report.status === dto.status) {
        return new AdminActionResponseDTO({
          message: `Report is already ${dto.status}.`,
        });
      }

      const previousStatus = report.status;
      await this.reportRepo.update({ id: report.id }, { status: dto.status });

      await this.auditService.record({
        actorId: dto.actorId,
        action: EAdminAction.REPORT_STATUS_CHANGED,
        // Recorded against the reported account as well as the report, so the
        // account detail page shows the whole story in one place.
        targetUserId: report.reported?.id ?? null,
        targetReportId: report.id,
        reason: dto.note ?? null,
        metadata: { from: previousStatus, to: dto.status },
      });

      return new AdminActionResponseDTO({
        message: `Report marked ${dto.status}.`,
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(
        (error as Error)?.message || 'Failed to update report status.',
      );
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while updating the report.',
      });
    }
  }

  async listAudit(
    adminListAuditDTO: AdminListAuditDTO,
  ): Promise<AdminPagedAuditDTO> {
    try {
      const { page, limit, skip } = resolvePaging(adminListAuditDTO);

      const [entries, total] = await this.auditRepo.findAndCount({
        where: adminListAuditDTO.targetUserId
          ? { targetUserId: adminListAuditDTO.targetUserId }
          : {},
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      return new AdminPagedAuditDTO({
        items: entries.map(
          (entry) =>
            new AdminAuditEntryDTO({
              id: entry.id,
              action: entry.action,
              actorEmail: entry.actorEmail,
              targetUserId: entry.targetUserId,
              targetReportId: entry.targetReportId,
              reason: entry.reason,
              metadata: entry.metadata,
              createdAt: entry.createdAt,
            }),
        ),
        total,
        page,
        limit,
      });
    } catch (error) {
      this.logger.error(
        (error as Error)?.message || 'Failed to load the audit log.',
      );
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while loading the audit log.',
      });
    }
  }
}
