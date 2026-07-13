import { EApplicationStatus } from '@app/common/database/enums/application-status.enum';
import { IsUUID, IsEnum } from 'class-validator';
import { ApplyApplicationResponseDTO } from './apply-application.dto';

export class UpdateApplicationStatusDTO {
  @IsUUID()
  applicationId: string;

  @IsEnum(EApplicationStatus)
  status: EApplicationStatus;
}

export class UpdateApplicationStatusResponseDTO extends ApplyApplicationResponseDTO {}
