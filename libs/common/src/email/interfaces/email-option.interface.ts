export interface IEmailOptions {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: any;
}
