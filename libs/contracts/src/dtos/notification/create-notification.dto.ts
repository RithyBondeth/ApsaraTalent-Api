import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { GetAllNotificationResponseDTO } from './get-all-notification.dto';

export class CreateNotificationCurrentUserDTO {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsOptional()
  sendPush?: boolean;

  @IsString()
  @IsOptional()
  senderAvatar?: string;
}

export class CreateNotificationCurrentUserResponseDTO extends GetAllNotificationResponseDTO {}
