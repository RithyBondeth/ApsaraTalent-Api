import { Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

/**
 * Minimal Telegram sender for application-level notifications.
 *
 * Deliberately separate from the Alertmanager → Telegram path: that one carries
 * aggregate infrastructure alerts and must never contain user data. This one
 * carries per-event notifications that DO contain user detail, which is why it
 * cannot go through Prometheus (user ids and emails as metric labels would
 * blow up cardinality).
 *
 * Reuses the same bot as Alertmanager. Set on the API gateway service:
 *   TELEGRAM_BOT_TOKEN  (same value as ALERTMANAGER_TELEGRAM_BOT_TOKEN)
 *   TELEGRAM_CHAT_ID    (same value as ALERTMANAGER_TELEGRAM_CHAT_ID)
 *
 * No-ops when either is unset, so local and test runs send nothing. Every send
 * is fire-and-forget: a Telegram outage must never affect a user request.
 */
@Injectable()
export class TelegramService {
  private readonly token = process.env.TELEGRAM_BOT_TOKEN;
  private readonly chatId = process.env.TELEGRAM_CHAT_ID;

  constructor(private readonly logger: Logger) {}

  get enabled(): boolean {
    return Boolean(this.token && this.chatId);
  }

  /**
   * Sends a message without awaiting delivery. Failures are logged, never
   * thrown — the caller is always in a user-facing request path.
   */
  send(text: string): void {
    if (!this.enabled) return;

    void this.deliver(text).catch((error: unknown) => {
      this.logger.warn(
        `[telegram] send failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  private async deliver(text: string): Promise<void> {
    const controller = new AbortController();
    // A hung Telegram request must not keep a socket open indefinitely.
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        this.logger.warn(`[telegram] sendMessage returned ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Escapes the HTML parse_mode metacharacters. */
  static escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
