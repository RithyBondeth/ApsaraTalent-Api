import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Twilio from 'twilio';
import { EmailService } from '../email/email.service';

@Injectable()
export class MessageService {
  private twilioClient: Twilio.Twilio;
  private emailService: EmailService;
  private readonly logger: Logger = new Logger(MessageService.name);

  constructor(private configService: ConfigService) {
    this.twilioClient = Twilio(
      this.configService.get<string>('sms.twilio.accountSid'),
      this.configService.get<string>('sms.twilio.authToken'),
    );
  }

  async sendOtp(phone: string, otp: string) {
    return this.twilioClient.messages.create({
      body: `Apsara Talent, Your OTP code is: ${otp}`,
      from: this.configService.get<string>('sms.twilio.phoneNumber'),
      to: phone,
    });
  }

  async sendResetToken(phone: string, resetToken: string) {
    return this.twilioClient.messages.create({
      body: `Apsara Talent, Your reset token is: ${resetToken}`,
      from: this.configService.get<string>('sms.twilio.phoneNumber'),
      to: phone,
    });
  }

  async notifyMatch(
    employeePhone: string,
    companyPhone: string,
    companyName: string,
    employeeName: string,
    employeeEmail: string,
    companyEmail: string,
  ) {
    if (!employeePhone || !companyPhone)
      throw new Error('Missing phone number for employee or company');

    const employeeMsg = `🎉 Match! ${companyName} likes you back. Open the app to chat.`;
    const companyMsg = `🎉 Match! ${employeeName} likes your company.`;

    try {
      await Promise.all([
        this.emailService.sendEmail({
          to: employeeEmail,
          from: companyEmail,
          subject: 'Matching Notification',
          text: employeeMsg,
        }),
        this.emailService.sendEmail({
          to: companyEmail,
          from: employeeEmail,
          subject: 'Matching Notification',
          text: companyMsg,
        }),
        // this.twilioClient.messages.create({
        //   from: this.configService.get<string>('TWILIO_PHONE_NUMBER'),
        //   to: employeePhone,
        //   body: employeeMsg,
        // }),
        // this.twilioClient.messages.create({
        //   from: this.configService.get<string>('TWILIO_PHONE_NUMBER'),
        //   to: companyPhone,
        //   body: companyMsg,
        // }),
      ]);
      this.logger.log('SMS sent to employee and company after match.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Twilio error: ${errorMessage}`);
      throw new Error('Failed to send match notifications');
    }
  }
}
