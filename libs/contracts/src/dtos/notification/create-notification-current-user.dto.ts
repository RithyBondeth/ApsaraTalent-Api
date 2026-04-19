import { IsObject, IsOptional, IsString } from 'class-validator';
import { GetAllNotificationResponseDTO } from './get-all-notification.dto';

export class CreateNotificationCurrentUserDTO {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}

export class CreateNotificationCurrentUserResponseDTO extends GetAllNotificationResponseDTO {}
