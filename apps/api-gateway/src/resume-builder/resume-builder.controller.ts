import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RESUME_BUILDER_SERVICE } from 'utils/constants/resume-builder-service';

@Controller('resume-builder')
export class ResumeBuilderController {
    constructor(@Inject(RESUME_BUILDER_SERVICE.NAME) private readonly resumeBuilderClient: ClientProxy) {}

    @Get()
    async buildResume() {
        return firstValueFrom(
            this.resumeBuilderClient.send(RESUME_BUILDER_SERVICE.ACTIONS.BUILD_RESUME, {})
        )
    }
}
