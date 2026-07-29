import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ResumeTemplateResponseDTO } from './resume-template.dto';

export class SearchResumeTemplateDTO {
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  @IsBoolean()
  isPremium: boolean;

  @IsString()
  @IsOptional()
  title: string;
}

export class SearchResumeTemplateResponseDTO extends ResumeTemplateResponseDTO {
  constructor(partial: Partial<SearchResumeTemplateResponseDTO>) {
    super(partial);
  }
}
