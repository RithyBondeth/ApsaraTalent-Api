import { AdminAuditLog } from '@app/common/database/entities/moderation/admin-audit-log.entity';
import { User } from '@app/common/database/entities/user.entity';
import { EAdminAction } from '@app/common/database/enums/admin-action.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

export type AuditEntry = {
  actorId: string;
  action: EAdminAction;
  targetUserId?: string | null;
  targetReportId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Writes the admin audit trail. A collaborator rather than a service of its
 * own, in the shape of RecommendationSupportService: both admin services need
 * it and neither owns it.
 */
@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AdminAuditService.name);
  }

  /**
   * Record an action. Awaited by callers *before* they report success, so a
   * failure to write the trail fails the action rather than performing it
   * unrecorded — the opposite trade to most logging, and the right one here:
   * an unlogged suspension is worse than a suspension that did not happen.
   */
  async record(entry: AuditEntry): Promise<void> {
    const actor = await this.userRepo.findOne({
      where: { id: entry.actorId },
      select: { id: true, email: true },
    });

    await this.auditRepo.save(
      this.auditRepo.create({
        actor: { id: entry.actorId } as User,
        // Snapshot: the trail has to stay readable after the admin's account
        // is gone, and the FK is ON DELETE SET NULL precisely so it can be.
        actorEmail: actor?.email ?? null,
        action: entry.action,
        targetUserId: entry.targetUserId ?? null,
        targetReportId: entry.targetReportId ?? null,
        reason: entry.reason ?? null,
        metadata: entry.metadata ?? null,
      }),
    );

    // Also to the application log, where the alerting lives.
    this.logger.info(
      `admin action ${entry.action} by ${actor?.email ?? entry.actorId} on user ${
        entry.targetUserId ?? 'n/a'
      }`,
    );
  }
}
