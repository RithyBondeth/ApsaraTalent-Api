import { User } from '@app/common/database/entities/user.entity';
import { LoginHistory } from '@app/common/database/entities/login-history.entity';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { In, LessThan, Repository } from 'typeorm';
import { DELETION_GRACE_PERIOD_MS } from './account-lifecycle.service';

const HARD_DELETE_BATCH_SIZE = 50;

/**
 * The counterpart to `AccountLifecycleService.requestDeletion` — the process
 * that eventually removes rows the user chose to delete more than 30 days
 * ago and did not cancel.
 *
 * Every direct `@ManyToOne(() => User)` in the schema either cascades on
 * delete (removing chats, notifications, employee/company profile, matches,
 * favorites) or is `SET NULL` on purpose (problem reports, admin audit log)
 * so the platform's own history survives. The one thing that does *not*
 * follow either automatic path is `LoginHistory`: its `userId` is a plain
 * uuid with no FK for the same reason the audit log's is, but it holds
 * personal data (IPs, user agents) that the deleted user is entitled to
 * have erased. That is what this service does explicitly before removing
 * the `user` row.
 *
 * Runs daily. A shorter cadence buys nothing — the grace window is 30 days
 * and one missed firing simply moves a row's deletion out by 24 hours.
 * `HARD_DELETE_BATCH_SIZE` bounds a single tick to something small so a
 * database blip doesn't take a whole batch down; the next tick catches up.
 */
@Injectable()
export class AccountHardDeleteService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(LoginHistory)
    private readonly loginHistoryRepo: Repository<LoginHistory>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AccountHardDeleteService.name);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async purgePastGrace(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - DELETION_GRACE_PERIOD_MS);
      const due = await this.userRepo.find({
        where: { deletedAt: LessThan(cutoff) },
        select: { id: true },
        take: HARD_DELETE_BATCH_SIZE,
      });
      if (due.length === 0) return;

      const userIds = due.map((row) => row.id);
      this.logger.info(
        `Hard-deleting ${userIds.length} account(s) past the ${
          DELETION_GRACE_PERIOD_MS / 86_400_000
        }-day grace window`,
      );

      // Login history has no FK to `user` (its uuid column is unconstrained
      // for the same audit-preservation reason `admin_audit_log` is) so the
      // cascade on the User delete does not touch it. It contains IPs and
      // user agents — personal data the user asked to erase — so it goes
      // first, explicitly.
      await this.loginHistoryRepo.delete({ userId: In(userIds) });

      // Then the user row itself; every declared cascade takes it from here.
      await this.userRepo.delete({ id: In(userIds) });
    } catch (error) {
      // Log and move on. The rows still meet the cutoff on the next tick.
      this.logger.error(
        `Hard-delete tick failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
