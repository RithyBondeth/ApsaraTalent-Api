import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import * as nodemailer from 'nodemailer';
import { emailConfig } from './config/email.config';
import { IEmailConfigOptions } from './interfaces/email-config.interface';
import { IEmailOptions } from './interfaces/email-option.interface';

/**
 * The SMTP transport itself — the only thing in the codebase that talks to
 * nodemailer.
 *
 * Nothing outside the outbox dispatcher should call this directly. Application
 * code goes through `EmailService`, which makes the send durable first; a
 * direct `send()` is a fire-and-forget that is lost if SMTP is down. The two
 * were one class until the outbox landed, which is why every caller only ever
 * had the lossy option.
 */
@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private emailConfig: IEmailConfigOptions;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      this.emailConfig = emailConfig(this.configService);

      this.transporter = nodemailer.createTransport({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: this.emailConfig.auth,
        ...this.emailConfig.transportOptions,
      });
      this.logger.info('Email service initialized successfully', {
        port: this.emailConfig.port,
        host: this.emailConfig.host,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        'Failed to initialize email transporter: ',
        errorMessage,
      );
      throw new Error(errorMessage);
    }
  }

  async send(emailOptions: IEmailOptions) {
    try {
      //Merge default from with provided from
      const from = emailOptions.from || this.emailConfig.defaultFrom;
      const mailOptions: nodemailer.SendMailOptions = {
        from,
        ...emailOptions,
      };

      //Validate email
      if (!mailOptions.to) throw new Error('Recipient email is required');

      //Send email
      const emailSent = await this.transporter.sendMail(mailOptions);

      //Logging errors
      this.logger.info('Email sent successfully', {
        messageId: emailSent.messageId,
        to: mailOptions.to,
        subject: emailOptions.subject,
      });

      //Return sent email
      return emailSent;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send email: ', errorMessage);
      throw new Error(errorMessage);
    }
  }
}
