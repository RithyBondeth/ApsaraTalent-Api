import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import * as nodemailer from 'nodemailer';
import { IEmailConfigOptions } from './interfaces/email-config.interface';
import { emailConfig } from './config/email.config';
import { IEmailOptions } from './interfaces/email-option.interface';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private emailConfig: IEmailConfigOptions;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      this.emailConfig = await emailConfig(this.configService);

      this.transporter = nodemailer.createTransport({
        host: this.emailConfig.host,
        post: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: this.emailConfig.auth,
        ...this.emailConfig.transportOptions,
      });
      this.logger.info('Email service initialized successfully', {
        port: this.emailConfig.port,
        host: this.emailConfig.host,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        'Failed to initialize email transporter: ',
        errorMessage,
      );
      throw new Error(errorMessage);
    }
  }

  async sendEmail(emailOptions: IEmailOptions) {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send email: ', errorMessage);
      throw new Error(errorMessage);
    }
  }
}
