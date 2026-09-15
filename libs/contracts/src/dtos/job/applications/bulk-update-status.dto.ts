import { EApplicationStatus } from '@app/common/database/enums/application-status.enum';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class BulkUpdateApplicationStatusDTO {
  /**
   * Applications to move. All are validated against the same target status;
   * per-row failures come back in the response rather than failing the batch,
   * so a mixed selection (some already terminal, some fine to move) is still
   * usable.
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  applicationIds: string[];

  @IsEnum(EApplicationStatus)
  status: EApplicationStatus;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  rejectionReason?: string;
}

export class BulkUpdateApplicationStatusItemResultDTO {
  applicationId: string;
  ok: boolean;
  /** New status when ok; unchanged status when not. */
  status: EApplicationStatus;
  /** Human-readable reason on failure. Null on success. */
  reason: string | null;

  constructor(partial: Partial<BulkUpdateApplicationStatusItemResultDTO>) {
    Object.assign(this, partial);
  }
}

export class BulkUpdateApplicationStatusResponseDTO {
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateApplicationStatusItemResultDTO)
  results: BulkUpdateApplicationStatusItemResultDTO[];

  updatedCount: number;
  failedCount: number;

  constructor(partial: Partial<BulkUpdateApplicationStatusResponseDTO>) {
    Object.assign(this, partial);
  }
}
