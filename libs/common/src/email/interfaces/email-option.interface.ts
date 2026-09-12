export interface IEmailOptions {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: any;
  /**
   * Extra SMTP headers, passed through to nodemailer untouched.
   *
   * Added for RFC 8058 one-click unsubscribe (`List-Unsubscribe` and
   * `List-Unsubscribe-Post`), which is what makes Gmail and Outlook show a
   * native unsubscribe control instead of leaving "report spam" as the reader's
   * easiest exit.
   */
  headers?: Record<string, string>;
}
