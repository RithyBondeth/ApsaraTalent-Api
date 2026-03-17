<<<<<<< HEAD
import { ConfigService } from "@nestjs/config";
import { IEmailConfigOptions } from "../interfaces/email-config.interface";

export const emailConfig = async (configService: ConfigService): Promise<IEmailConfigOptions> => ({
    host: configService.get<string>('SMTP_HOST'),
    port: configService.get<number>('SMTP_PORT'),
    secure: false, // false for TLS - port 587
    transportOptions: {
        tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false
        }
    },
    auth: {
        user: configService.get<string>('EMAIL_USER'),
        pass: configService.get<string>('EMAIL_PASSWORD'),
      },
    defaultFrom: configService.get<string>('EMAIL_FROM')
});
=======
import { ConfigService } from '@nestjs/config';
import { IEmailConfigOptions } from '../interfaces/email-config.interface';

export const emailConfig = async (
  configService: ConfigService,
): Promise<IEmailConfigOptions> => ({
  host: configService.get<string>('email.host'),
  port: configService.get<number>('email.port'),
  secure: false, // false for TLS - port 587
  transportOptions: {
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
    },
  },
  auth: {
    user: configService.get<string>('email.user'),
    pass: configService.get<string>('email.password'),
  },
  defaultFrom: configService.get<string>('email.from'),
});
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
