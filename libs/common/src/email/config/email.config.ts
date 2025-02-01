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