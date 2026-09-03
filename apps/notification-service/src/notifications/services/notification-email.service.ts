import { ENotificationCategory } from '@app/common/database/enums/notification-category.enum';
import { ENotificationChannel } from '@app/common/database/enums/notification-channel.enum';
import { EmailService } from '@app/common/email/email.service';
import { User } from '@app/common/database/entities/user.entity';
import { parseAllowedOrigins } from '@app/common/utils/cors-origin.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { NotificationPreferenceService } from '../../preferences/services/notification-preference.service';
import {
  CATEGORY_PATHS,
  renderNotificationEmail,
} from '../utils/notification-email.util';

export interface ISendNotificationEmailInput {
  userId: string;
  title: string;
  message: string;
  category: ENotificationCategory;
}

/**
 * Turns a notification into an email, if the user wants one.
 *
 * This lives in notification-service rather than at the five call sites that
 * emit notifications, and that is the whole point: job-service, chat-service
 * and the gateway already say *what happened* by emitting CREATE_NOTIFICATION.
 * Deciding whether that becomes an email, rendering it, and honouring the
 * user's preferences are one concern, in one place, next to the data that
 * answers them. The alternative — an EmailService call beside every emit — is
 * five copies of a preference check that will drift.
 *
 * Nothing here is on the critical path: `EmailService` writes to the outbox and
 * returns, so a slow mail host cannot slow down the request that caused the
 * notification.
 */
@Injectable()
export class NotificationEmailService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(NotificationEmailService.name);
  }

  async send({
    userId,
    title,
    message,
    category,
  }: ISendNotificationEmailInput): Promise<void> {
    const appOrigin = this.appOrigin();
    if (!appOrigin) {
      // Every link in the mail would be relative and therefore dead. Sending a
      // notification email nobody can act on is worse than sending none.
      this.logger.warn(
        'FRONTEND_ORIGIN is not configured — skipping notification email',
      );
      return;
    }

    const allowed = await this.preferenceService.canDeliver({
      userId,
      category,
      channel: ENotificationChannel.EMAIL,
    });
    if (!allowed) return;

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.email) {
      this.logger.warn(`No email address on record for userId=${userId}`);
      return;
    }

    const unsubscribeToken =
      await this.preferenceService.unsubscribeTokenFor(userId);

    const { subject, text, html } = renderNotificationEmail({
      title,
      message,
      category,
      appOrigin,
      path: CATEGORY_PATHS[category],
      unsubscribeToken,
    });

    await this.emailService.sendEmail({
      to: user.email,
      subject,
      text,
      html,
      // RFC 8058. Gmail and Outlook surface a native unsubscribe control from
      // these, which is the difference between a reader unsubscribing and a
      // reader marking the message as spam — and it is spam complaints, not
      // unsubscribes, that damage the sending domain.
      headers: {
        'List-Unsubscribe': `<${appOrigin}/unsubscribe?token=${encodeURIComponent(
          unsubscribeToken,
        )}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
  }

  /**
   * The first concrete origin in FRONTEND_ORIGIN.
   *
   * That variable is a CORS allowlist and may hold several entries, including
   * wildcard patterns like `https://*.netlify.app`. A wildcard is not a URL
   * anyone can click, so it is skipped rather than pasted into a link.
   */
  private appOrigin(): string | null {
    const origins = parseAllowedOrigins(
      this.configService.get<string>('frontend.origin'),
    );
    return origins.find((origin) => !origin.includes('*')) ?? null;
  }
}
