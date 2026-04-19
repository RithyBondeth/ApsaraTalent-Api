import { BuildResumeDTO, BuildResumeResponseDTO } from '@app/contracts/dtos';
import {
  CreateResumeTemplateDTO,
  CreateResumeTemplateResponseDTO,
  ResumeTemplateResponseDTO,
  SearchResumeTemplateResponseDTO,
} from '@app/contracts/dtos/resume/template';

export interface IResumeTemplateController {
  findAllResumeTemplate(data?: any): Promise<ResumeTemplateResponseDTO[]>;
  findOneResumeTemplateById(data?: any): Promise<ResumeTemplateResponseDTO>;
  createResumeTemplate(
    dto: CreateResumeTemplateDTO,
    image: Express.Multer.File,
  ): Promise<CreateResumeTemplateResponseDTO>;
  searchResumeTemplate(data?: any): Promise<SearchResumeTemplateResponseDTO[]>;
}

export interface IResumeBuilderController {
  buildResume(data: BuildResumeDTO): Promise<BuildResumeResponseDTO>;
}
