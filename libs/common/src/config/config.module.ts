import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { validationSchema } from './validation.schema';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
      // Tier-specific file first (chosen by NODE_ENV set in the run script),
      // then plain .env as a fallback for any keys it doesn't override.
      // NODE_ENV=production -> .env.production, etc.
      // Local dev (NODE_ENV unset or "local") has no .env.local here, so it
      // falls through to .env. In Docker/Railway none of these files exist and
      // ConfigModule reads the injected process.env — this stays a safe no-op.
      envFilePath: [`.env.${process.env.NODE_ENV || 'local'}`, '.env'],
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
