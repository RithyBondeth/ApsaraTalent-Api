export interface IEmailConfigOptions {
  // SMTP Configuration
  host: string;
  port: number;
  secure?: boolean;
  // Authentication
  auth: {
    user: string;
    pass: string;
  };
  // Default sender
  defaultFrom?: string;
  // Optional transport options
  transportOptions?: any;
}
