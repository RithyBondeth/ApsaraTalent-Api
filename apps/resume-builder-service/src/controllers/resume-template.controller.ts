import { Controller } from '@nestjs/common';
import { ResumeTemplateService } from '../services/resume-template.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from 'utils/constants/resume-builder-service.constant';
import { CreateResumeTemplateDTO } from '../dtos/create-resume-template.dto';
import { IResumeTemplateController } from '@app/common/interfaces/resume-controller.interface';
import { SearchTemplateDTO } from '../dtos/search-resume-template.dto';

@Controller()
export class ResumeTemplateController implements IResumeTemplateController {
  constructor(private readonly resumeTemplateService: ResumeTemplateService) {}

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.FIND_ALL_RESUME_TEMPLATES)
  async findAllResumeTemplate(): Promise<any> {
    return this.resumeTemplateService.findAllResumeTemplate();
  }

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.FIND_ONE_RESUME_TEMPLATE)
  async findOneResumeTemplateById(@Payload() resumeId: string): Promise<any> {
    return this.resumeTemplateService.findOneResumeTemplate(resumeId);
  }

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.CREATE_RESUME_TEMPLATE)
  async createResumeTemplate(
    @Payload()
    payload: {
      createResumeTemplateDTO: CreateResumeTemplateDTO;
      image: Express.Multer.File;
    },
  ): Promise<any> {
    return this.resumeTemplateService.createResumeTemplate(
      payload.createResumeTemplateDTO,
      payload.image,
    );
  }

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.SEARCH_RESUME_TEMPLATE)
  async searchResumeTemplate(
    @Payload() searchTemplateDTO: SearchTemplateDTO,
  ): Promise<any> {
    return this.resumeTemplateService.searchResumeTemplate(searchTemplateDTO);
  }
}
