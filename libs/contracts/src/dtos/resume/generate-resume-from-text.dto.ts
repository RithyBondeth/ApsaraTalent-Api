import { Transform } from 'class-transformer';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export const RESUME_TEMPLATE_KEYS = [
  'modern',
  'classic',
  'creative',
  'minimalist',
  'timeline',
  'bold',
  'compact',
  'elegant',
  'colorful',
  'professional',
  'corporate',
  'dark',
] as const;

export type ResumeTemplateKey = (typeof RESUME_TEMPLATE_KEYS)[number];

export class GenerateResumeFromTextDTO {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(20)
  @MaxLength(8_000)
  sourceText: string;

  @IsString()
  @IsIn(RESUME_TEMPLATE_KEYS)
  template: ResumeTemplateKey;
}
