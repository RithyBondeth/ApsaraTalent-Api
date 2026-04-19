import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ResumeTemplateResponseDTO } from './resume-template.dto';

export class SearchResumeTemplateDTO {
  @Type(() => Boolean)
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
    Object.assign(this, partial);
  }
}
