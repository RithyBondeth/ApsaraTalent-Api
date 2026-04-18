import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateResumeTemplateDTO {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() description: string;
  @IsString() @IsOptional() image?: string;
  @IsNumber() @IsNotEmpty() price: number;
  @IsBoolean() @IsNotEmpty() isPremium: boolean;
}

export class ResumeTemplateResponseDTO {
  id: string;
  title: string;
  description: string;
  image: string | null;
  price: number | null;
  isPremium: boolean;
  createdAt: Date;

  constructor(partial: Partial<ResumeTemplateResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class CreateResumeTemplateResponseDTO extends ResumeTemplateResponseDTO {
  constructor(partial: Partial<CreateResumeTemplateResponseDTO>) {
    super(partial);
    Object.assign(this, partial);
  }
}
