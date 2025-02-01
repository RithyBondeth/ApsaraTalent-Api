export interface IEmailOptions {
    to: string | string[];
    from?: string;
    subject: string;
    text: string;
    html?: string;  
    attachments?: any;
}