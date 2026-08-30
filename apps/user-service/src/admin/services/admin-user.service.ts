import { AdminAuditLog } from '@app/common/database/entities/moderation/admin-audit-log.entity';
import { UserReport } from '@app/common/database/entities/moderation/user-report.entity';
import { User } from '@app/common/database/entities/user.entity';
import { EAdminAction } from '@app/common/database/enums/admin-action.enum';
import { EReportStatus } from '@app/common/database/enums/report-status.enum';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { EUserStatus } from '@app/common/database/enums/user-status.enum';
import { RedisService } from '@app/common/redis/redis.service';
import {
  AdminActionResponseDTO,
  AdminAuditEntryDTO,
  AdminGetUserDTO,
  AdminListUsersDTO,
  AdminOverviewDTO,
  AdminPagedUsersDTO,
  AdminUpdateUserStatusDTO,
  AdminUserDetailDTO,
} from '@app/contracts/dtos/user';
import { IAdminUserService } from '@app/contracts/interfaces/service/user-service.interface';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { MoreThan, Repository } from 'typeorm';
import {
  resolvePaging,
  toAdminReport,
  toAdminUserListItem,
} from '../utils/admin-mapper.util';
import { AdminAuditService } from './admin-audit.service';

@Injectable()
export class AdminUserService implements IAdminUserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserReport)
    private readonly reportRepo: Repository<UserReport>,
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
    private readonly auditService: AdminAuditService,
    private readonly redisService: RedisService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AdminUserService.name);
  }

  async getOverview(): Promise<AdminOverviewDTO> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        employees,
        companies,
        suspendedUsers,
        bannedUsers,
        pendingReports,
        newUsersLast7Days,
      ] = await Promise.all([
        this.userRepo.count(),
        this.userRepo.count({ where: { role: EUserRole.EMPLOYEE } }),
        this.userRepo.count({ where: { role: EUserRole.COMPANY } }),
        this.userRepo.count({ where: { status: EUserStatus.SUSPENDED } }),
        this.userRepo.count({ where: { status: EUserStatus.BANNED } }),
        this.reportRepo.count({ where: { status: EReportStatus.PENDING } }),
        this.userRepo.count({ where: { createdAt: MoreThan(sevenDaysAgo) } }),
      ]);

      return new AdminOverviewDTO({
        totalUsers,
        employees,
        companies,
        suspendedUsers,
        bannedUsers,
        pendingReports,
        newUsersLast7Days,
      });
    } catch (error) {
      this.logger.error(
        (error as Error)?.message || 'Failed to build admin overview.',
      );
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while loading the overview.',
      });
    }
  }

  async listUsers(
    adminListUsersDTO: AdminListUsersDTO,
  ): Promise<AdminPagedUsersDTO> {
    try {
      const { page, limit, skip } = resolvePaging(adminListUsersDTO);
      const { search, role, status } = adminListUsersDTO;

      const query = this.userRepo
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.employee', 'employee')
        .leftJoinAndSelect('user.company', 'company')
        .orderBy('user.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      if (role) query.andWhere('user.role = :role', { role });
      // Filters on the stored status, not the effective one: an admin
      // filtering for "suspended" wants the accounts carrying a suspension,
      // including ones whose term has just run out.
      if (status) query.andWhere('user.status = :status', { status });

      if (search?.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        query.andWhere(
          `(LOWER(user.email) LIKE :term
            OR LOWER(user.phone) LIKE :term
            OR LOWER(COALESCE(employee.firstname, '') || ' ' || COALESCE(employee.lastname, '')) LIKE :term
            OR LOWER(COALESCE(company.name, '')) LIKE :term)`,
          { term },
        );
      }

      const [users, total] = await query.getManyAndCount();
      const openReports = await this.countOpenReportsFor(
        users.map((u) => u.id),
      );

      return new AdminPagedUsersDTO({
        items: users.map((user) =>
          toAdminUserListItem(user, openReports.get(user.id) ?? 0),
        ),
        total,
        page,
        limit,
      });
    } catch (error) {
      this.logger.error((error as Error)?.message || 'Failed to list users.');
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while loading users.',
      });
    }
  }

  async getUser(adminGetUserDTO: AdminGetUserDTO): Promise<AdminUserDetailDTO> {
    try {
      const user = await this.userRepo.findOne({
        where: { id: adminGetUserDTO.userId },
        relations: ['employee', 'company'],
      });

      if (!user) {
        throw new RpcException({
          statusCode: 404,
          message: 'That account does not exist.',
        });
      }

      const [reports, audit, openReports] = await Promise.all([
        this.reportRepo.find({
          where: { reported: { id: user.id } },
          relations: [
            'reporter',
            'reporter.employee',
            'reporter.company',
            'reported',
          ],
          order: { createdAt: 'DESC' },
          take: 50,
        }),
        this.auditRepo.find({
          where: { targetUserId: user.id },
          order: { createdAt: 'DESC' },
          take: 50,
        }),
        this.countOpenReportsFor([user.id]),
      ]);

      const base = toAdminUserListItem(user, openReports.get(user.id) ?? 0);

      return new AdminUserDetailDTO({
        ...base,
        employeeId: user.employee?.id ?? null,
        companyId: user.company?.id ?? null,
        lastLoginMethod: user.lastLoginMethod ?? null,
        reportsAgainst: reports.map(toAdminReport),
        statusHistory: audit.map(
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
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error((error as Error)?.message || 'Failed to load user.');
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while loading the account.',
      });
    }
  }

  async updateUserStatus(
    dto: AdminUpdateUserStatusDTO,
  ): Promise<AdminActionResponseDTO> {
    try {
      const { actorId, userId, status, reason } = dto;

      // An admin cannot act on their own account. Nothing good comes of it and
      // a slip could lock the last administrator out of the platform.
      if (actorId === userId) {
        throw new RpcException({
          statusCode: 400,
          message: 'You cannot change the status of your own account.',
        });
      }

      const target = await this.userRepo.findOne({
        where: { id: userId },
        select: { id: true, role: true, status: true, email: true },
      });

      if (!target) {
        throw new RpcException({
          statusCode: 404,
          message: 'That account does not exist.',
        });
      }

      // Administrators are not moderatable through the panel. Demote with
      // `npm run admin:grant -- --revoke` first, which is deliberately a
      // shell operation: one compromised admin session should not be able to
      // disable every other administrator.
      if (target.role === EUserRole.ADMIN) {
        throw new RpcException({
          statusCode: 403,
          message:
            'Administrator accounts cannot be suspended from the panel. ' +
            'Revoke the admin role first.',
        });
      }

      const suspendedUntil = this.resolveSuspendedUntil(dto);
      const previousStatus = target.status ?? EUserStatus.ACTIVE;

      await this.userRepo.update(
        { id: userId },
        {
          status,
          // Cleared on anything but a timed suspension, so lifting a
          // suspension cannot leave an expiry behind to confuse the next read.
          suspendedUntil,
          statusReason: status === EUserStatus.ACTIVE ? null : reason,
          statusChangedAt: new Date(),
        },
      );

      // Written before the cache is dropped and before we report success: an
      // action nobody can trace is worse than an action that failed.
      await this.auditService.record({
        actorId,
        action: this.actionFor(status),
        targetUserId: userId,
        reason,
        metadata: {
          from: previousStatus,
          to: status,
          suspendedUntil: suspendedUntil?.toISOString() ?? null,
        },
      });

      // AuthGuard caches the session for two minutes. Dropping the key is what
      // makes a suspension bite on the user's very next request rather than
      // up to two minutes later.
      await this.redisService.invalidateAuthSession(userId);

      return new AdminActionResponseDTO({
        message:
          status === EUserStatus.ACTIVE
            ? 'Account reinstated.'
            : `Account ${status}.`,
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(
        (error as Error)?.message || 'Failed to update account status.',
      );
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while updating the account.',
      });
    }
  }

  /**
   * An expiry only means something on a suspension. Rejected rather than
   * ignored on the other two: an admin who typed a date and got a permanent
   * ban would have no way of knowing.
   */
  private resolveSuspendedUntil(dto: AdminUpdateUserStatusDTO): Date | null {
    if (!dto.suspendedUntil) return null;

    if (dto.status !== EUserStatus.SUSPENDED) {
      throw new RpcException({
        statusCode: 400,
        message: 'An end date only applies to a suspension.',
      });
    }

    const until = new Date(dto.suspendedUntil);
    if (Number.isNaN(until.getTime())) {
      throw new RpcException({
        statusCode: 400,
        message: 'That suspension end date is not a valid date.',
      });
    }
    if (until.getTime() <= Date.now()) {
      throw new RpcException({
        statusCode: 400,
        message: 'A suspension must end in the future.',
      });
    }
    return until;
  }

  private actionFor(status: EUserStatus): EAdminAction {
    if (status === EUserStatus.BANNED) return EAdminAction.USER_BANNED;
    if (status === EUserStatus.SUSPENDED) return EAdminAction.USER_SUSPENDED;
    return EAdminAction.USER_REINSTATED;
  }

  /**
   * Pending reports per account, in one grouped query.
   *
   * A count per row would be one query per user on every page of the list —
   * the N+1 that would make this page the slowest in the product.
   */
  private async countOpenReportsFor(
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
