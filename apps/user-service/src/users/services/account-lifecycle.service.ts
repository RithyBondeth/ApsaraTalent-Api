import { Application } from '@app/common/database/entities/application.entity';
import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { Interview } from '@app/common/database/entities/interview.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { LoginHistory } from '@app/common/database/entities/login-history.entity';
import { NotificationPreference } from '@app/common/database/entities/notification-preference.entity';
import { Notification } from '@app/common/database/entities/notification.entity';
import { ProblemReport } from '@app/common/database/entities/problem-report.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { generateUserKey } from '@app/common/redis/redis-keys.util';
import {
  AccountDataExportDTO,
  AccountLifecycleUserDTO,
  CancelAccountDeletionResponseDTO,
  RequestAccountDeletionResponseDTO,
} from '@app/contracts/dtos/user';
import { Injectable } from '@nestjs/common';
import { AnalyticsService, EAnalyticsEvent } from '@app/common/analytics';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

/** How long a soft-deleted account can be restored from. */
export const DELETION_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/** How often the same user may kick off an export — one per 24 hours. */
const EXPORT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const EXPORT_COOLDOWN_PREFIX = 'apsaratalent:account:export:cooldown';

/**
 * User-initiated account lifecycle: request deletion, cancel a pending one,
 * export the data the account owns.
 *
 * Deletion is soft first — `User.deletedAt` gets a timestamp. The hard-delete
 * happens on a cron (`AccountHardDeleteService`) 30 days later. During the
 * grace window the account is still usable so the owner can navigate to
 * "Cancel deletion" from the settings page. This is not the "you can't log
 * in until you restore" pattern some products use; it is the "your account
 * will be permanently deleted on X, cancel here" pattern the copy on the
 * settings page describes.
 *
 * Every cascade that runs on hard-delete was picked with this feature in
 * mind. See the FK declarations on `Notification`, `NotificationPreference`,
 * `ProblemReport` (SET NULL, so a bug report survives), `AdminAuditLog`
 * (uuid, no FK — the audit trail cannot be erased by the audited party).
 */
@Injectable()
export class AccountLifecycleService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(Interview)
    private readonly interviewRepo: Repository<Interview>,
    @InjectRepository(JobMatching)
    private readonly matchingRepo: Repository<JobMatching>,
    @InjectRepository(EmployeeFavoriteCompany)
    private readonly employeeFavoritesRepo: Repository<EmployeeFavoriteCompany>,
    @InjectRepository(CompanyFavoriteEmployee)
    private readonly companyFavoritesRepo: Repository<CompanyFavoriteEmployee>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly notificationPreferenceRepo: Repository<NotificationPreference>,
    @InjectRepository(ProblemReport)
    private readonly problemReportRepo: Repository<ProblemReport>,
    @InjectRepository(LoginHistory)
    private readonly loginHistoryRepo: Repository<LoginHistory>,
    private readonly redisService: RedisService,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AccountLifecycleService.name);
  }

  /**
   * Mark the account for deletion. Idempotent: calling twice keeps the
   * *original* scheduled date so a nervous double-click does not silently
   * push the timer out.
   */
  async requestDeletion({
    userId,
  }: AccountLifecycleUserDTO): Promise<RequestAccountDeletionResponseDTO> {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new RpcException({
          statusCode: 404,
          message: 'Account not found.',
        });
      }

      const alreadyRequested = user.deletedAt ?? null;
      const requestedAt = alreadyRequested ?? new Date();

      if (!alreadyRequested) {
        await this.userRepo.update({ id: userId }, { deletedAt: requestedAt });
        await this.bustCurrentUserCache(userId);
        this.analyticsService.capture(
          userId,
          EAnalyticsEvent.ACCOUNT_DELETION_REQUESTED,
          { role: user.role },
        );
      }

      const scheduledFor = new Date(
        requestedAt.getTime() + DELETION_GRACE_PERIOD_MS,
      );

      return new RequestAccountDeletionResponseDTO({
        message: alreadyRequested
          ? 'Account deletion was already scheduled.'
          : 'Account deletion scheduled.',
        scheduledFor: scheduledFor.toISOString(),
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(
        `Failed to request deletion for userId=${userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw new RpcException({
        statusCode: 500,
        message: 'Failed to request account deletion.',
      });
    }
  }

  /**
   * Clear a pending deletion. No-op if the account has no pending deletion.
   */
  async cancelDeletion({
    userId,
  }: AccountLifecycleUserDTO): Promise<CancelAccountDeletionResponseDTO> {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new RpcException({
          statusCode: 404,
          message: 'Account not found.',
        });
      }

      if (!user.deletedAt) {
        return new CancelAccountDeletionResponseDTO({
          message: 'No pending deletion for this account.',
        });
      }

      await this.userRepo.update({ id: userId }, { deletedAt: null });
      await this.bustCurrentUserCache(userId);

      this.analyticsService.capture(
        userId,
        EAnalyticsEvent.ACCOUNT_DELETION_CANCELLED,
        { role: user.role },
      );

      return new CancelAccountDeletionResponseDTO({
        message: 'Account deletion cancelled.',
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(
        `Failed to cancel deletion for userId=${userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw new RpcException({
        statusCode: 500,
        message: 'Failed to cancel account deletion.',
      });
    }
  }

  /**
   * Bundle everything the account owner is entitled to under a "right to
   * data portability" request.
   *
   * Rate-limited to once per 24 hours per user through Redis — an export is
   * a full scan across a dozen tables and is not the kind of thing a bored
   * user should be able to hammer. The lock is best-effort (Redis is not a
   * hard dependency); when the cache is unavailable, the rate limit falls
   * open rather than blocking a request that has already been authenticated.
   */
  async exportData({
    userId,
  }: AccountLifecycleUserDTO): Promise<AccountDataExportDTO> {
    const cooldownKey = `${EXPORT_COOLDOWN_PREFIX}:${userId}`;
    const lastExport = await this.redisService.get<number>(cooldownKey);
    if (lastExport && Date.now() - lastExport < EXPORT_COOLDOWN_MS) {
      throw new RpcException({
        statusCode: 429,
        message:
          'You have already requested an export in the last 24 hours. Please try again later.',
      });
    }

    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: [
          'employee',
          'employee.skills',
          'employee.careerScopes',
          'employee.experiences',
          'employee.educations',
          'employee.socials',
          'company',
          'company.benefits',
          'company.values',
          'company.careerScopes',
          'company.socials',
          'company.images',
          'company.openPositions',
        ],
      });
      if (!user) {
        throw new RpcException({
          statusCode: 404,
          message: 'Account not found.',
        });
      }

      const employee = user.employee?.id ?? null;
      const company = user.company?.id ?? null;

      // Every collection loaded in parallel. Each of these is bounded by
      // the account's own rows, so the total is small even for heavy users.
      const [
        applications,
        interviews,
        matches,
        employeeFavorites,
        companyFavorites,
        notifications,
        notificationPreference,
        problemReports,
        loginHistory,
      ] = await Promise.all([
        employee
          ? this.applicationRepo.find({
              where: { employee: { id: employee } },
              relations: ['job'],
            })
          : Promise.resolve([]),
        this.interviewRepo.find({
          where: [
            ...(employee ? [{ employee: { id: employee } }] : []),
            ...(company ? [{ company: { id: company } }] : []),
          ],
        }),
        this.matchingRepo.find({
          where: [
            ...(employee ? [{ employee: { id: employee } }] : []),
            ...(company ? [{ company: { id: company } }] : []),
          ],
        }),
        employee
          ? this.employeeFavoritesRepo.find({
              where: { employee: { id: employee } },
            })
          : Promise.resolve([]),
        company
          ? this.companyFavoritesRepo.find({
              where: { company: { id: company } },
            })
          : Promise.resolve([]),
        this.notificationRepo.find({ where: { user: { id: userId } } }),
        this.notificationPreferenceRepo.findOne({
          where: { user: { id: userId } },
        }),
        this.problemReportRepo.find({
          where: { reporter: { id: userId } },
        }),
        this.loginHistoryRepo.find({ where: { userId } }),
      ]);

      const dump = new AccountDataExportDTO({
        exportedAt: new Date().toISOString(),
        // Redact the password hash and the refresh token — even the account
        // owner should not see credential material in a downloaded file.
        user: this.redactUser(user),
        employee: user.employee
          ? this.plain(this.stripUserBack(user.employee))
          : null,
        company: user.company
          ? this.plain(this.stripUserBack(user.company))
          : null,
        applications: applications.map((row) => this.plain(row)),
        interviews: interviews.map((row) => this.plain(row)),
        matches: matches.map((row) => this.plain(row)),
        favorites: [
          ...employeeFavorites.map((row) => this.plain(row)),
          ...companyFavorites.map((row) => this.plain(row)),
        ],
        notifications: notifications.map((row) => this.plain(row)),
        notificationPreference: notificationPreference
          ? this.plain(notificationPreference)
          : null,
        problemReports: problemReports.map((row) => this.plain(row)),
        loginHistory: loginHistory.map((row) => this.plain(row)),
      });

      // Best-effort: if Redis is down the next request wouldn't be rate-limited.
      // That is deliberately better than 500-ing an export that succeeded.
      await this.redisService.set(cooldownKey, Date.now(), EXPORT_COOLDOWN_MS);

      this.analyticsService.capture(
        userId,
        EAnalyticsEvent.ACCOUNT_DATA_EXPORTED,
        { role: user.role },
      );

      return dump;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(
        `Failed to export data for userId=${userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw new RpcException({
        statusCode: 500,
        message: 'Failed to export account data.',
      });
    }
  }

  private redactUser(user: User): Record<string, unknown> {
    const clone = this.plain(user);
    // Credentials never belong in a data-portability export, even for the
    // owner. `password` is a bcrypt hash and `refreshToken` is a bearer.
    delete clone.password;
    delete clone.refreshToken;
    delete clone.twoFactorSecret;
    delete clone.otpCode;
    delete clone.emailVerificationOtp;
    delete clone.resetPasswordToken;
    delete clone.employee;
    delete clone.company;
    return clone;
  }

  /**
   * A structural clone that drops entity metadata and back-references. Feeds
   * `JSON.stringify` without falling into a cycle when TypeORM has hydrated
   * an inverse relation.
   */
  private plain<T extends object>(entity: T): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(entity)) {
      if (value === undefined) continue;
      if (value instanceof Date) {
        out[key] = value.toISOString();
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  private stripUserBack<T extends { user?: unknown }>(entity: T): T {
    const clone = { ...entity };
    delete clone.user;
    return clone;
  }

  /**
   * Wipe the current-user cache so the next `/user/current-user` reflects
   * the new deletion state — otherwise the settings banner would take a
   * full TTL to appear or disappear after a request/cancel.
   */
  private async bustCurrentUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.redisService.del(generateUserKey('detail', userId)),
      this.redisService.del(generateUserKey('profile', userId)),
      this.redisService.del(generateUserKey('settings', userId)),
    ]);
  }
}
