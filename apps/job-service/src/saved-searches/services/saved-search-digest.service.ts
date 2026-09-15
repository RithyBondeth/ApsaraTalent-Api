import { SavedSearch } from '@app/common/database/entities/saved-search.entity';
import {
  ESavedSearchFrequency,
  SAVED_SEARCH_FREQUENCY_INTERVAL_MS,
} from '@app/common/database/enums/saved-search-frequency.enum';
import { EmailService } from '@app/common/email/email.service';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { IsNull, LessThan, Or, Repository } from 'typeorm';
import { SavedSearchService } from './saved-search.service';

/** How many saved searches the dispatcher processes per tick. */
const DIGEST_BATCH_SIZE = 100;

/**
 * The scheduled dispatcher that turns saved searches into email digests + an
 * in-app notification. Kept beside the CRUD service (rather than inside it)
 * so the request-scoped surface stays clean and the cron can be tested in
 * isolation.
 *
 * Idempotency is a database column, not a memory of "did we run in this
 * window" — the same pattern as `InterviewReminderService`. The picking query
 * matches rows whose `lastNotifiedAt` sits far enough in the past for their
 * frequency, so a missed tick simply catches up on the next one, and a
 * concurrent replica sees the same rows already stamped by the first
 * winner's write.
 */
@Injectable()
export class SavedSearchDigestService {
  constructor(
    @InjectRepository(SavedSearch)
    private readonly savedSearchRepo: Repository<SavedSearch>,
    private readonly savedSearchService: SavedSearchService,
    private readonly emailService: EmailService,
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SavedSearchDigestService.name);
  }

  /**
   * Runs hourly. Small enough that a DAILY digest lands within an hour of the
   * user's saved-time-of-day drift; large enough that a slow search never
   * lets ticks pile up.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async dispatchDueDigests(): Promise<void> {
    try {
      // A DAILY row is due if its lastNotifiedAt is older than 24h — or NULL,
      // meaning it has never been notified. WEEKLY is the same shape at a
      // longer interval. The picking query fans this out per frequency so
      // each row is only compared against the right threshold.
      const now = Date.now();
      const buckets = await this.pickDue(
        [ESavedSearchFrequency.DAILY, ESavedSearchFrequency.WEEKLY],
        now,
      );
      if (buckets.length === 0) return;

      this.logger.info(`Processing ${buckets.length} saved-search digest(s)`);

      for (const saved of buckets) {
        await this.processOne(saved);
      }
    } catch (error) {
      this.logger.error(
        `Saved-search digest tick failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private async pickDue(
    frequencies: ESavedSearchFrequency[],
    now: number,
  ): Promise<SavedSearch[]> {
    const collected: SavedSearch[] = [];
    for (const frequency of frequencies) {
      const threshold = new Date(
        now - SAVED_SEARCH_FREQUENCY_INTERVAL_MS[frequency],
      );
      const rows = await this.savedSearchRepo.find({
        where: {
          frequency,
          // `Or` collapses to `lastNotifiedAt IS NULL OR lastNotifiedAt < :t`.
          // Both express "not sent recently enough"; splitting them across
          // two find() calls would double the query count for the same rows.
          lastNotifiedAt: Or(IsNull(), LessThan(threshold)) as never,
        },
        relations: ['employee', 'employee.user'],
        take: DIGEST_BATCH_SIZE,
      });
      collected.push(...rows);
      if (collected.length >= DIGEST_BATCH_SIZE) break;
    }
    return collected.slice(0, DIGEST_BATCH_SIZE);
  }

  private async processOne(saved: SavedSearch): Promise<void> {
    /*
      Mark first, notify after. If the mark write fails we skip the send: a
      digest is a courtesy, and under-sending is safer than double-sending
      when two replicas race. The seen-set is only updated on a successful
      mark for the same reason — a lost mark means the next tick reads the
      same lastResultJobIds and produces the same diff.
    */
    const nowStamp = new Date();
    let jobIds: string[];
    try {
      const result = await this.savedSearchService.runSearch(
        saved.filters as Record<string, unknown>,
      );
      jobIds = result.jobIds;
    } catch (error) {
      this.logger.warn(
        `Search failed for savedSearch=${saved.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      // Stamp anyway so a persistently-broken filter does not thunder every
      // tick — the user will see the empty-digest pause and can investigate.
      await this.savedSearchRepo.update(
        { id: saved.id },
        { lastNotifiedAt: nowStamp },
      );
      return;
    }

    const seen = new Set(saved.lastResultJobIds ?? []);
    const newIds = jobIds.filter((id) => !seen.has(id));

    // Always stamp; only email when there is something to say. Stamping on an
    // empty diff advances the window so tomorrow's tick asks the same
    // "since when" question about tomorrow, not today.
    try {
      await this.savedSearchRepo.update(
        { id: saved.id },
        { lastNotifiedAt: nowStamp, lastResultJobIds: jobIds },
      );
    } catch (error) {
      this.logger.warn(
        `Could not stamp savedSearch=${saved.id}, skipping notify: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return;
    }

    if (newIds.length === 0) return;

    await this.sendDigest(saved, newIds);
  }

  private async sendDigest(
    saved: SavedSearch,
    newIds: string[],
  ): Promise<void> {
    const user = saved.employee?.user;
    if (!user?.id) return;

    // The in-app notification always fires, regardless of email; a user who
    // has muted email still expects to see the count on their feed.
    this.notificationClient.emit(
      NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
      {
        userId: user.id,
        title: `${newIds.length} new match${newIds.length === 1 ? '' : 'es'} for "${saved.name}"`,
        message: `Your saved search "${saved.name}" has new results.`,
        type: 'info',
        data: {
          savedSearchId: saved.id,
          savedSearchName: saved.name,
          newMatchCount: newIds.length,
          eventType: 'saved_search_digest',
        },
        sendPush: true,
      },
    );

    if (!user.email) return;

    const appOrigin = this.appOrigin();
    const searchUrl = `${appOrigin}/search?savedSearch=${encodeURIComponent(saved.id)}`;

    // Deliberately terse. A long template drifts and dies; the payload here
    // is the user's own search name + a link back to it. The list of jobs is
    // rendered on the page they land on, not in the email — a job title
    // duplicated across every digest ages faster than the link ever will.
    const subject = `${newIds.length} new job${newIds.length === 1 ? '' : 's'} for "${saved.name}"`;
    const text = [
      `We found ${newIds.length} new job${newIds.length === 1 ? '' : 's'} matching your saved search "${saved.name}".`,
      '',
      `Open the results: ${searchUrl}`,
      '',
      `You are receiving this because you saved this search. Manage or delete it: ${appOrigin}/setting?tab=alerts`,
    ].join('\n');
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #37352F; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; margin: 0 0 12px;">
          ${newIds.length} new job${newIds.length === 1 ? '' : 's'} for &ldquo;${escapeHtml(saved.name)}&rdquo;
        </h1>
        <p style="font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
          Your saved search on Apsara Talent has new matches waiting.
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${searchUrl}" style="display: inline-block; padding: 10px 16px; background: #1C78D2; color: #FFFFFF; text-decoration: none; font-weight: 600;">
            See the results
          </a>
        </p>
        <p style="font-size: 12px; color: #6B6B68; margin: 0;">
          You are receiving this because you saved this search.
          <a href="${appOrigin}/setting?tab=alerts" style="color: #1C78D2;">Manage or delete it.</a>
        </p>
      </div>
    `.trim();

    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject,
        text,
        html,
      });
    } catch (error) {
      // A failed email does not roll back the stamp — we already told the
      // in-app feed, and next tick will show the same new-count if the mail
      // host was down, because these ids remain in `lastResultJobIds`. But
      // that is the acceptable trade: a delivery retry that duplicates the
      // digest is worse than a missed one on a broken domain.
      this.logger.warn(
        `Failed to enqueue digest email for savedSearch=${saved.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private appOrigin(): string {
    // Same shape as NotificationEmailService: take the first concrete origin
    // out of the CORS allowlist. A wildcard entry is skipped rather than
    // interpolated into a link.
    const raw = this.configService.get<string>('FRONTEND_ORIGIN') ?? '';
    const first = raw
      .split(',')
      .map((s) => s.trim())
      .find((s) => s.length > 0 && !s.includes('*'));
    return first ?? 'https://app.apsaratalent.com';
  }
}

/**
 * Minimal HTML escaper for the digest subject/heading. Enough for the two
 * substitutions this file makes — full escaping lives in the notification
 * email template.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
