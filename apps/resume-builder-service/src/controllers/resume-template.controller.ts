import { IResumeTemplateRpcController } from '@app/contracts/interfaces/controller/resume-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from '@app/contracts/constants/service-actions/resume-builder-service.constant';
import {
  CreateResumeTemplateDTO,
  CreateResumeTemplateResponseDTO,
  ResumeTemplateResponseDTO,
  SearchResumeTemplateDTO,
  SearchResumeTemplateResponseDTO,
} from '@app/contracts/dtos/resume/template';
import {
  I_RESUME_TEMPLATE_SERVICE,
  IResumeTemplateService,
} from '@app/contracts/interfaces/service/resume-builder-service.interface';

@Controller()
export class ResumeTemplateController implements IResumeTemplateRpcController {
  constructor(
    @Inject(I_RESUME_TEMPLATE_SERVICE)
    private readonly resumeTemplateService: IResumeTemplateService,
  ) {}

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.FIND_ALL_RESUME_TEMPLATES)
  async findAllResumeTemplate(): Promise<ResumeTemplateResponseDTO[]> {
    return this.resumeTemplateService.findAllResumeTemplate();
  }

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.FIND_ONE_RESUME_TEMPLATE)
  async findOneResumeTemplateById(
    @Payload() resumeId: string,
  ): Promise<ResumeTemplateResponseDTO> {
    return this.resumeTemplateService.findOneResumeTemplate(resumeId);
  }

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.CREATE_RESUME_TEMPLATE)
  async createResumeTemplate(
    @Payload('dto') createResumeTemplateDTO: CreateResumeTemplateDTO,
    @Payload('image') image: Express.Multer.File,
  ): Promise<CreateResumeTemplateResponseDTO> {
    return this.resumeTemplateService.createResumeTemplate(
      createResumeTemplateDTO,
      image,
    );
  }

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.SEARCH_RESUME_TEMPLATE)
  async searchResumeTemplate(
    @Payload() searchResumeTemplateDTO: SearchResumeTemplateDTO,
  ): Promise<SearchResumeTemplateResponseDTO[]> {
    return this.resumeTemplateService.searchResumeTemplate(
      searchResumeTemplateDTO,
    );
  }
}
