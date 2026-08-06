import { LoginHistory } from '@app/common/database/entities/login-history.entity';
import { loginAttempts } from '@app/common/metrics/metrics';
import { TelegramService } from '@app/common/telegram/telegram.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';

export interface LoginAttemptContext {
  email: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  userId?: string | null;
}

/**
 * Records every login attempt and notifies Telegram on success.
 *
 * Runs at the gateway because that is the only place the client IP and user
 * agent exist — auth-service receives an RPC payload without them.
 *
 * Every method here is best-effort: an audit write or a Telegram outage must
 * never turn a working login into a failed one. Errors are logged and
 * swallowed, deliberately.
 */
@Injectable()
export class LoginAuditService {
  constructor(
    @InjectRepository(LoginHistory)
    private readonly repository: Repository<LoginHistory>,
    private readonly telegram: TelegramService,
    private readonly logger: Logger,
  ) {}

  async recordSuccess(context: LoginAttemptContext): Promise<void> {
    loginAttempts.inc({ result: 'success' });
    await this.persist({ ...context, success: true, failureReason: null });
    this.notifySuccess(context);
  }

  async recordFailure(
    context: LoginAttemptContext,
    failureReason: string,
  ): Promise<void> {
    loginAttempts.inc({ result: 'failure' });
    await this.persist({ ...context, success: false, failureReason });
  }

  private async persist(
    row: LoginAttemptContext & {
      success: boolean;
      failureReason: string | null;
    },
  ): Promise<void> {
    try {
      await this.repository.insert({
        userId: row.userId ?? null,
        email: row.email,
        ipAddress: row.ipAddress,
        // Long UA strings are truncated rather than rejected by the column.
        userAgent: row.userAgent ? row.userAgent.slice(0, 1000) : null,
        success: row.success,
        failureReason: row.failureReason,
      });
    } catch (error: unknown) {
      this.logger.warn(
        `[login-audit] failed to record attempt: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private notifySuccess(context: LoginAttemptContext): void {
    if (!this.telegram.enabled) return;

    const esc = TelegramService.escape;
    const lines = [
      '🔓 <b>Login</b>',
      `User: ${esc(context.email ?? 'unknown')}`,
      context.userId ? `ID: ${esc(context.userId)}` : null,
      `IP: ${esc(context.ipAddress ?? 'unknown')}`,
      `Agent: ${esc((context.userAgent ?? 'unknown').slice(0, 120))}`,
      `Time: ${new Date().toISOString()}`,
    ].filter(Boolean);

    this.telegram.send(lines.join('\n'));
  }
}
