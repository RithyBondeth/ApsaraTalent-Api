import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AiInterviewPrepDTO {
  @IsUUID()
  eid: string;

  @IsUUID()
  cid: string;

  @IsOptional()
  @IsString()
  interviewTitle?: string;
}

export class AiInterviewPrepQuestion {
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

export class AiInterviewPrepResponseDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiInterviewPrepQuestion)
  questions: AiInterviewPrepQuestion[];

  constructor(partial: Partial<AiInterviewPrepResponseDTO>) {
    Object.assign(this, partial);
  }
}
