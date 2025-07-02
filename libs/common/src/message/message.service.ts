import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Twilio from 'twilio';

@Injectable()
export class MessageService {
  private twilioClient: Twilio.Twilio;

  constructor(private configService: ConfigService) {
    this.twilioClient = Twilio(
      this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      this.configService.get<string>('TWILIO_AUTH_TOKEN'),
    );
  }

  async sendOtp(phone: string, otp: string) {
    return this.twilioClient.messages.create({
      body: `Apsara Talent, Your OTP code is: ${otp}`,
      from: this.configService.get<string>("TWILIO_PHONE_NUMBER"),
      to: phone,
    });
  }

  async sendResetToken(phone: string, resetToken: string) {
    return this.twilioClient.messages.create({
      body: `Apsara Talent, Your reset token is: ${resetToken}`,
      from: this.configService.get<string>("TWILIO_PHONE_NUMBER"),
      to: phone,
    });
  }

  async notifyMatch(employeePhone: string, companyPhone: string, companyName: string, employeeName: string) {
    const employeeMsg = `🎉 Match! ${companyName} likes you back. Open the app to chat.`;
    const companyMsg = `🎉 Match! ${employeeName} likes your company.`;

    await Promise.all([
      this.twilioClient.messages.create({
        from: this.configService.get<string>("TWILIO_PHONE_NUMBER"),
        to: employeePhone,
        body: employeeMsg,
      }),
      this.twilioClient.messages.create({
        from: this.configService.get<string>("TWILIO_PHONE_NUMBER"),
        to: companyPhone,
        body: companyMsg,
      }),
    ]);
  }
}
