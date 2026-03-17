<<<<<<< HEAD
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from 'utils/constants/resume-builder-service';
import { ResumeBuilderController } from './resume-builder.controller';

@Module({
    imports: [
        ClientsModule.register([
            {
                name: RESUME_BUILDER_SERVICE.NAME,
                transport: Transport.TCP,
                options: {
                    host: 'localhost',
                    port: 3003
                }
            }
        ])
    ],
    controllers: [ResumeBuilderController]
=======
import { JwtModule, UploadfileModule } from '@app/common';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RESUME_BUILDER_SERVICE } from 'utils/constants/resume-builder-service.constant';
import { ResumeBuilderController } from './controllers/resume-builder.controller';
import { ResumeTemplateController } from './controllers/resume-template.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RESUME_BUILDER_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.resume.host'),
            port: configService.get<number>('services.resume.port'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    UploadfileModule,
    JwtModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [ResumeBuilderController, ResumeTemplateController],
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
})
export class ResumeBuilderModule {}
