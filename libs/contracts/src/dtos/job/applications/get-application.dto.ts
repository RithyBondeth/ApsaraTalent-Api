import { IsUUID, IsOptional } from 'class-validator';
import { ApplyApplicationResponseDTO } from './apply-application.dto';

export class GetApplicationsDTO {
  @IsUUID()
  @IsOptional()
  jobId?: string;

  @IsUUID()
  @IsOptional()
  employeeId?: string;
}

export class GetApplicationResponseDTO extends ApplyApplicationResponseDTO {}
