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
}
