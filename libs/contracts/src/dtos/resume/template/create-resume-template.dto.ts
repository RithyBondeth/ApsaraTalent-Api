import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CoreResponseDTO } from '../../shared/core-response.dto';

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

export class CreateResumeTemplateResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<CreateResumeTemplateResponseDTO>) {
    super(partial);
  }
}
