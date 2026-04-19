import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateResumeTemplateDTO {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsBoolean()
  @IsNotEmpty()
  isPremium: boolean;
}

export class CreateResumeTemplateResponseDTO {
  message: string;

  constructor(partial: Partial<CreateResumeTemplateResponseDTO>) {
    Object.assign(this, partial);
  }
}
