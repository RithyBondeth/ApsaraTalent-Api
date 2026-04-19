import {
  BuildResumeDTO,
  BuildResumeResponseDTO,
  SearchResumeTemplateDTO,
  SearchResumeTemplateResponseDTO,
} from '@app/contracts/dtos';
import {
  CreateResumeTemplateDTO,
  CreateResumeTemplateResponseDTO,
  ResumeTemplateResponseDTO,
} from '@app/contracts/dtos/resume/template';

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
  ): Promise<CreateResumeTemplateResponseDTO>;
  searchResumeTemplate(
    searchTemplateDTO: SearchResumeTemplateDTO,
  ): Promise<SearchResumeTemplateResponseDTO[]>;
}
