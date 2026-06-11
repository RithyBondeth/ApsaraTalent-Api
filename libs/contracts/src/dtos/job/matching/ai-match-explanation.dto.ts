import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AiMatchExplanationDTO {
  @IsUUID()
  eid: string;

  @IsUUID()
  cid: string;

  @IsOptional()
  @IsString()
  lang?: string;
}

export class AiMatchExplanationResponseDTO {
  @IsNumber()
  score: number;

  @IsString()
  verdict: string;

  @IsString()
  explanation: string;

  @IsArray()
  @IsString({ each: true })
  strengths: string[];

  @IsArray()
  @IsString({ each: true })
  gaps: string[];

  constructor(partial: Partial<AiMatchExplanationResponseDTO>) {
    Object.assign(this, partial);
  }
}
