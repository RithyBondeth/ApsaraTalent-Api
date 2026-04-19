import { BuildResumeDTO, BuildResumeResponseDTO } from '@app/contracts/dtos';
import {
  CreateResumeTemplateDTO,
  CreateResumeTemplateResponseDTO,
  ResumeTemplateResponseDTO,
  SearchResumeTemplateDTO,
  SearchResumeTemplateResponseDTO,
} from '@app/contracts/dtos/resume/template';

export interface IResumeTemplateController {
  findAllResumeTemplate(): Promise<ResumeTemplateResponseDTO[]>;
  findOneResumeTemplateById(resumeId: string): Promise<ResumeTemplateResponseDTO>;
  createResumeTemplate(
    dto: CreateResumeTemplateDTO,
    image: Express.Multer.File,
  ): Promise<CreateResumeTemplateResponseDTO>;
  searchResumeTemplate(
    data: SearchResumeTemplateDTO,
  ): Promise<SearchResumeTemplateResponseDTO[]>;
}

export interface IResumeBuilderController {
  buildResume(data: BuildResumeDTO): Promise<BuildResumeResponseDTO>;
}
