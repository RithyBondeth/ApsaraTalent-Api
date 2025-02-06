import { Controller, Get } from '@nestjs/common';
import { ResumeBuilderServiceService } from '../services/resume-builder-service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from 'utils/constants/resume-builder-service';

@Controller()
export class ResumeBuilderServiceController {
  constructor(private readonly resumeBuilderServiceService: ResumeBuilderServiceService) {}

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.BUILD_RESUME)
  getHello() {
    console.log("Hello!");
    return 'Resume from Gateway';
  }
}
