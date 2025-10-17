import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TPlasgateConfig } from './interface/plasgate-config.interface';

@Injectable()
export class PlasgateSmsService {
  constructor(private readonly configService: ConfigService) {}
  private readonly logger = new Logger(PlasgateSmsService.name);

  async sendSms(phone: string, message: string): Promise<void> {
    const privateKey = this.configService.get<string>('PLAS_GATE_PRIVATE_KEY');
    const secretKey = this.configService.get<string>('PLAS_GATE_SECRET_KEY');
    const sender = this.configService.get<string>('PLAS_GATE_SMS_SENDER');

    const url = `https://cloudapi.plasgate.com/rest/send?private_key=${privateKey}`;

    const payload = {
      sender,
      to: phone,
      content: message,
    };

    console.log({
      url,
      headers: {
        'X-Secret': secretKey,
        'Content-Type': 'application/json',
      },
      payload,
    });

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'X-Secret': secretKey,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`SMS sent: ${JSON.stringify(response.data)}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        this.logger.error(
          `Axios error response: ${JSON.stringify(err.response?.data || {}, null, 2)}`,
        );
      }
      this.logger.error(`SMS failed: ${err.message}`);
      throw err;
    }
  }
}
