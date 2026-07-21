import { EProblemCategory } from '@app/common/database/enums/problem-category.enum';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/* ----------------------------- HTTP body DTOs ----------------------------- */
export class ReportProblemBodyDTO {
  @IsEnum(EProblemCategory)
  category: EProblemCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  details: string;

  // Browser context captured client-side; purely diagnostic, so it is optional
  // and never trusted for anything but the support email body.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;
}

/* ------------------------------- RPC payloads ----------------------------- */
export class ReportProblemDTO {
  @IsUUID()
  reporterId: string;

  @IsEnum(EProblemCategory)
  category: EProblemCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  details: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;
}

/* ------------------------------- Responses -------------------------------- */
export class ReportProblemResponseDTO {
  message: string;

  constructor(partial: Partial<ReportProblemResponseDTO>) {
    Object.assign(this, partial);
  }
}
