import { BuildResumeDTO } from 'apps/resume-builder-service/src/dtos/resume-builder.dto';
import { CreateResumeTemplateDTO } from 'apps/resume-builder-service/src/dtos/create-resume-template.dto';
import { SearchTemplateDTO } from 'apps/resume-builder-service/src/dtos/search-resume-template.dto';
import { MessageResponse } from '../domain/message-response.interface';

export const I_RESUME_BUILDER_SERVICE = 'IResumeBuilderService';
export const I_RESUME_TEMPLATE_SERVICE = 'IResumeTemplateService';

export interface IResumeBuilderService {
  buildResume(buildResumeDTO: BuildResumeDTO): Promise<any>;
}

export interface IResumeTemplateService {
  findAllResumeTemplate(): Promise<any>;
  findOneResumeTemplate(resumeId: string): Promise<any>;
  createResumeTemplate(
    createResumeTemplateDTO: CreateResumeTemplateDTO,
    image: Express.Multer.File,
  ): Promise<MessageResponse>;
  searchResumeTemplate(searchTemplateDTO: SearchTemplateDTO): Promise<any>;
}
