import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InterviewPrepPdfQuestionDTO {
  @IsString()
  question: string;

  @IsString()
  questionKm: string;

  @IsString()
  category: string;

  @IsString()
  tip: string;

  @IsString()
  tipKm: string;
}

export class GenerateInterviewPrepPdfDTO {
  @IsString()
  interviewTitle: string;

  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  companyIndustry?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewPrepPdfQuestionDTO)
  questions: InterviewPrepPdfQuestionDTO[];
}

export class GenerateInterviewPrepPdfResponseDTO {
  filename: string;
  mimeType: string;
  data: string; // base64

  constructor(partial: Partial<GenerateInterviewPrepPdfResponseDTO>) {
    Object.assign(this, partial);
  }
}
