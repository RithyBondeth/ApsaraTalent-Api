import {
  BuildResumeDTO,
  CreateResumeTemplateDTO,
  SearchTemplateDTO,
} from '@app/contracts/dtos/resume';
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
