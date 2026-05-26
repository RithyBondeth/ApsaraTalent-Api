import {
  BuildResumeDTO,
  BuildResumeResponseDTO,
  SearchResumeTemplateDTO,
  SearchResumeTemplateResponseDTO,
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
} from '@app/contracts/dtos';
import {
  CreateResumeTemplateDTO,
  CreateResumeTemplateResponseDTO,
  ResumeTemplateResponseDTO,
} from '@app/contracts/dtos/resume/template';

export const I_RESUME_BUILDER_SERVICE = 'IResumeBuilderService';
export const I_RESUME_TEMPLATE_SERVICE = 'IResumeTemplateService';
export const I_PDF_GENERATOR_SERVICE = 'IPdfGeneratorService';

export interface IResumeBuilderService {
  buildResume(buildResumeDTO: BuildResumeDTO): Promise<BuildResumeResponseDTO>;
  optimizeResume(
    optimizeResumeDTO: OptimizeResumeDTO,
  ): Promise<OptimizeResumeResponseDTO>;
  generateCoverLetter(
    generateCoverLetterDTO: GenerateCoverLetterDTO,
  ): Promise<GenerateCoverLetterResponseDTO>;
  polishCoverLetter(
    polishCoverLetterDTO: PolishCoverLetterDTO,
  ): Promise<PolishCoverLetterResponseDTO>;
  generateCoverLetterPdf(
    generateCoverLetterPdfDTO: GenerateCoverLetterPdfDTO,
  ): Promise<GenerateCoverLetterPdfResponseDTO>;
  generateInterviewPrepPdf(
    generateInterviewPrepPdfDTO: GenerateInterviewPrepPdfDTO,
  ): Promise<GenerateInterviewPrepPdfResponseDTO>;
}

export interface IImageService {
  optimizeProfilePicture(imageData: string): Promise<string>;
}

export interface IPdfGeneratorService {
  generate(html: string): Promise<Buffer>;
}

export interface IResumeTemplateService {
  findAllResumeTemplate(): Promise<ResumeTemplateResponseDTO[]>;
  findOneResumeTemplate(resumeId: string): Promise<ResumeTemplateResponseDTO>;
  createResumeTemplate(
    createResumeTemplateDTO: CreateResumeTemplateDTO,
    image: Express.Multer.File,
  ): Promise<CreateResumeTemplateResponseDTO>;
  searchResumeTemplate(
    searchResumeTemplateDTO: SearchResumeTemplateDTO,
  ): Promise<SearchResumeTemplateResponseDTO[]>;
}
