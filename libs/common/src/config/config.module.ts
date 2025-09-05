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
      envFilePath: [
        '.env.local',
        '.env',
        '.env.development',
        '.env.production',
        '.env.staging',
        '.env.test',
      ],
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}