import { IsArray, IsOptional, IsString } from 'class-validator';

export class GenerateCoverLetterDTO {
  @IsString()
  employeeName: string;

  @IsString()
  @IsOptional()
  employeeJob?: string;

  @IsArray()
  @IsString({ each: true })
  employeeSkills: string[];

  @IsString()
  @IsOptional()
  employeeExperience?: string;

  @IsString()
  @IsOptional()
  employeeDescription?: string;

  @IsString()
  companyName: string;

  @IsString()
  @IsOptional()
  companyIndustry?: string;

  @IsString()
  @IsOptional()
  companyDescription?: string;

  @IsArray()
  @IsString({ each: true })
  openPositions: string[];
}

export class GenerateCoverLetterResponseDTO {
  coverLetter: string;

  constructor(partial: Partial<GenerateCoverLetterResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class PolishCoverLetterDTO {
  @IsString()
  coverLetterText: string;
}

export class PolishCoverLetterResponseDTO {
  coverLetter: string;

  constructor(partial: Partial<PolishCoverLetterResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class GenerateCoverLetterPdfDTO {
  @IsString()
  employeeName: string;

  @IsString()
  @IsOptional()
  employeeJob?: string;

  @IsString()
  companyName: string;

  @IsString()
  @IsOptional()
  companyIndustry?: string;

  @IsString()
  coverLetterText: string;

  /** 'classic' | 'modern' | 'minimal' | 'bold' — defaults to 'classic' */
  @IsString()
  @IsOptional()
  style?: string;
}

export class GenerateCoverLetterPdfResponseDTO {
  filename: string;
  mimeType: string;
  data: string; // base64

  constructor(partial: Partial<GenerateCoverLetterPdfResponseDTO>) {
    Object.assign(this, partial);
  }
}
