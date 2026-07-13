import {
  BuildResumeDTO,
  BuildResumeResponseDTO,
  OptimizeResumeDTO,
  OptimizeResumeResponseDTO,
  GenerateCoverLetterDTO,
  GenerateCoverLetterResponseDTO,
  PolishCoverLetterDTO,
  PolishCoverLetterResponseDTO,
  GenerateCoverLetterPdfDTO,
  GenerateCoverLetterPdfResponseDTO,
  GenerateInterviewPrepPdfDTO,
  GenerateInterviewPrepPdfResponseDTO,
  RefineProfileBioDTO,
} from '@app/contracts/dtos';
import {
  CreateResumeTemplateDTO,
  CreateResumeTemplateResponseDTO,
  ResumeTemplateResponseDTO,
  SearchResumeTemplateDTO,
  SearchResumeTemplateResponseDTO,
} from '@app/contracts/dtos/resume/template';
import { Response } from 'express';

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

export type IResumeTemplateRpcController = IResumeTemplateController;

export interface IResumeBuilderController {
  buildResume(buildResumeDTO: BuildResumeDTO): Promise<BuildResumeResponseDTO>;
  optimizeResume(
    optimizeResumeDTO: OptimizeResumeDTO,
  ): Promise<OptimizeResumeResponseDTO>;
  generateCoverLetter(
    generateCoverLetterDTO: GenerateCoverLetterDTO,
  ): Promise<GenerateCoverLetterResponseDTO>;
  streamCoverLetter(
    generateCoverLetterDTO: GenerateCoverLetterDTO,
    res: Response,
  ): Promise<void>;
  polishCoverLetter(
    polishCoverLetterDTO: PolishCoverLetterDTO,
  ): Promise<PolishCoverLetterResponseDTO>;
  streamPolishCoverLetter(
    polishCoverLetterDTO: PolishCoverLetterDTO,
    res: Response,
  ): Promise<void>;
  streamOptimizeResume(
    optimizeResumeDTO: OptimizeResumeDTO,
    res: Response,
  ): Promise<void>;
  streamRefineBio(
    refineProfileBioDTO: RefineProfileBioDTO,
    res: Response,
  ): Promise<void>;
  generateCoverLetterPdf(
    generateCoverLetterPdfDTO: GenerateCoverLetterPdfDTO,
  ): Promise<GenerateCoverLetterPdfResponseDTO>;
  generateInterviewPrepPdf(
    generateInterviewPrepPdfDTO: GenerateInterviewPrepPdfDTO,
  ): Promise<GenerateInterviewPrepPdfResponseDTO>;
}

export type IResumeBuilderRpcController = Omit<
  IResumeBuilderController,
  | 'streamCoverLetter'
  | 'streamPolishCoverLetter'
  | 'streamOptimizeResume'
  | 'streamRefineBio'
>;
