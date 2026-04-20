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
  findOneResumeTemplateById(
    resumeId: string,
  ): Promise<ResumeTemplateResponseDTO>;
  createResumeTemplate(
    createResumeTemplateDTO: CreateResumeTemplateDTO,
    image: Express.Multer.File,
  ): Promise<CreateResumeTemplateResponseDTO>;
  searchResumeTemplate(
    searchResumeTemplateDTO: SearchResumeTemplateDTO,
  ): Promise<SearchResumeTemplateResponseDTO[]>;
}

export interface IResumeTemplateRpcController extends IResumeTemplateController {}

export interface IResumeBuilderController {
  buildResume(buildResumeDTO: BuildResumeDTO): Promise<BuildResumeResponseDTO>;
}

export interface IResumeBuilderRpcController extends IResumeBuilderController {}
