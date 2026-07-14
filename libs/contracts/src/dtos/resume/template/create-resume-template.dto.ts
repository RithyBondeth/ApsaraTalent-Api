import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsIn,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CoreResponseDTO } from '../../shared/core-response.dto';
import { Transform, Type } from 'class-transformer';

export class CreateResumeTemplateDTO {
  @IsString()
  @IsIn([
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
  ])
  templateKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1_000)
  description: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsBoolean()
  @IsNotEmpty()
  @Transform(({ value }) => value === true || value === 'true')
  isPremium: boolean;
}

export class CreateResumeTemplateResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<CreateResumeTemplateResponseDTO>) {
    super(partial);
  }
}
