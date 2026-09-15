import { ENotificationCategory } from '@app/common/database/enums/notification-category.enum';

export interface INotificationEmailInput {
  title: string;
  message: string;
  category: ENotificationCategory;
  /** Absolute origin of the web app, already trimmed of a trailing slash. */
  appOrigin: string;
  /** In-app destination for the primary action, e.g. `/application`. */
  path: string;
  unsubscribeToken: string;
}

export interface IRenderedNotificationEmail {
  subject: string;
  text: string;
  html: string;
}

/**
 * Where each category takes the reader once they click.
 *
 * Deliberately a landing page rather than a deep link to the row: notification
 * `data` is written by five different call sites and its shape is not
 * guaranteed, so a link built from it is a 404 waiting to happen. The list
 * pages are stable and the item is at the top of them.
 */
export const CATEGORY_PATHS: Record<ENotificationCategory, string> = {
  [ENotificationCategory.APPLICATION]: '/application',
  [ENotificationCategory.INTERVIEW]: '/interview',
  [ENotificationCategory.MATCH]: '/matching',
  [ENotificationCategory.MESSAGE]: '/message',
  [ENotificationCategory.ACCOUNT]: '/setting',
};

const CATEGORY_ACTIONS: Record<ENotificationCategory, string> = {
  [ENotificationCategory.APPLICATION]: 'View application',
  [ENotificationCategory.INTERVIEW]: 'View interview',
  [ENotificationCategory.MATCH]: 'View match',
  [ENotificationCategory.MESSAGE]: 'Open messages',
  [ENotificationCategory.ACCOUNT]: 'Open settings',
};

/**
 * Escapes text destined for the HTML body.
 *
 * Notification titles and messages are assembled from user-supplied data — a
 * candidate's username, a company name, a job title. Interpolating those into
 * markup unescaped is how a display name becomes markup in someone's inbox.
 */
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Renders one notification as an email.
 *
 * Table-based layout with inline styles, because that is what mail clients
 * support — Outlook still renders with Word's engine, and Gmail strips
 * `<style>` blocks in some contexts. Colours are literal hex rather than the
 * app's CSS custom properties for the same reason: there is no cascade to
 * resolve them, and `prefers-color-scheme` is unreliable across clients, so the
 * mail commits to one light palette taken from the app's own tokens.
 */
export const renderNotificationEmail = (
  input: INotificationEmailInput,
): IRenderedNotificationEmail => {
  const { title, message, category, appOrigin, path, unsubscribeToken } = input;

  const actionUrl = `${appOrigin}${path}`;
  const unsubscribeUrl = `${appOrigin}/unsubscribe?token=${encodeURIComponent(
    unsubscribeToken,
  )}`;
  const settingsUrl = `${appOrigin}/setting`;
  const action = CATEGORY_ACTIONS[category];

  const text = [
    title,
    '',
    message,
    '',
    `${action}: ${actionUrl}`,
    '',
    '—',
    `Change what we email you about: ${settingsUrl}`,
    `Unsubscribe from notification emails: ${unsubscribeUrl}`,
  ].join('\n');

  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f6f3;margin:0;padding:32px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e9e9e7;">
        <tr>
          <td style="padding:28px 32px 8px 32px;font-family:Ubuntu,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#787774;">Apsara Talent</p>
            <h1 style="margin:12px 0 0 0;font-size:20px;line-height:1.3;font-weight:700;color:#37352f;">${escapeHtml(
              title,
            )}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 32px 24px 32px;font-family:Ubuntu,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#37352f;">${escapeHtml(
              message,
            )}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px 32px;font-family:Ubuntu,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <a href="${actionUrl}" style="display:inline-block;background-color:#1c78d2;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 20px;">${action}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px 32px;border-top:1px solid #e9e9e7;font-family:Ubuntu,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#787774;">
              You are receiving this because of your notification settings.
              <a href="${settingsUrl}" style="color:#787774;">Change what we email you about</a>
              or <a href="${unsubscribeUrl}" style="color:#787774;">unsubscribe</a>.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();

  return { subject: title, text, html };
};
