import {
  BuildResumeDTO,
  BuildResumeResponseDTO,
  CreateResumeTemplateDTO,
  ResumeTemplateResponseDTO,
  SearchResumeTemplateResponseDTO,
  SearchTemplateDTO,
} from '@app/contracts/dtos/resume';
import { MessageResponse } from '../domain/message-response.interface';

export const I_RESUME_BUILDER_SERVICE = 'IResumeBuilderService';
export const I_RESUME_TEMPLATE_SERVICE = 'IResumeTemplateService';

export interface IResumeBuilderService {
  buildResume(buildResumeDTO: BuildResumeDTO): Promise<BuildResumeResponseDTO>;
}

export interface IResumeTemplateService {
  findAllResumeTemplate(): Promise<ResumeTemplateResponseDTO[]>;
  findOneResumeTemplate(resumeId: string): Promise<ResumeTemplateResponseDTO>;
  createResumeTemplate(
    createResumeTemplateDTO: CreateResumeTemplateDTO,
    image: Express.Multer.File,
  ): Promise<MessageResponse>;
  searchResumeTemplate(
    searchTemplateDTO: SearchTemplateDTO,
  ): Promise<SearchResumeTemplateResponseDTO[]>;
}
