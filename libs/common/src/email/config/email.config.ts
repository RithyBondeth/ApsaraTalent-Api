import { ConfigService } from '@nestjs/config';
import { IEmailConfigOptions } from '../interfaces/email-config.interface';

export const emailConfig = async (
  configService: ConfigService,
): Promise<IEmailConfigOptions> => ({
  // These keys are .required() in validation.schema.ts, so getOrThrow states
  // that guarantee at the use site rather than re-typing it as optional.
  host: configService.getOrThrow<string>('email.host'),
  port: configService.getOrThrow<number>('email.port'),
  secure: false, // false for TLS - port 587
  transportOptions: {
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
    },
  },
  auth: {
    user: configService.getOrThrow<string>('email.user'),
    pass: configService.getOrThrow<string>('email.password'),
  },
  defaultFrom: configService.getOrThrow<string>('email.from'),
});
