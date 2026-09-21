import { EApplicationStatus } from '@app/common/database/enums/application-status.enum';
import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApplyApplicationResponseDTO } from './apply-application.dto';

export class UpdateApplicationStatusDTO {
  @IsUUID()
  applicationId: string;

  @IsEnum(EApplicationStatus)
  status: EApplicationStatus;

  /**
   * Optional, and only meaningful alongside REJECTED — the service drops it for
   * every other status rather than letting a stale reason ride along a move
   * back up the pipeline.
   */
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  rejectionReason?: string;
}

export class UpdateApplicationStatusResponseDTO extends ApplyApplicationResponseDTO {}
