import { LoginHistory } from '@app/common/database/entities/login-history.entity';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { LessThan, Repository } from 'typeorm';

/**
 * Enforces the 90-day retention policy on login_history.
 *
 * These rows contain personal data (IP address, user agent). Keeping them
 * indefinitely is both a privacy problem and an unbounded table, so this runs
 * daily and deletes anything older than the window.
 *
 * Change RETENTION_DAYS only alongside a decision about why — the number is the
 * policy, not an implementation detail.
 */
@Injectable()
export class LoginHistoryCleanupService {
  private static readonly RETENTION_DAYS = 90;

  constructor(
    @InjectRepository(LoginHistory)
    private readonly repository: Repository<LoginHistory>,
    private readonly logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async prune(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - LoginHistoryCleanupService.RETENTION_DAYS);

    try {
      const result = await this.repository.delete({
        createdAt: LessThan(cutoff),
      });

      if (result.affected) {
        this.logger.log(
          `[login-audit] pruned ${result.affected} rows older than ${LoginHistoryCleanupService.RETENTION_DAYS} days`,
        );
      }
    } catch (error: unknown) {
      this.logger.warn(
        `[login-audit] prune failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
