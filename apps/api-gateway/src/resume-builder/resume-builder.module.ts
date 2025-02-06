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
})
export class ResumeBuilderModule {}
