import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UserIdDTO {
  @IsUUID()
  userId: string;
}

export class UpdatePushNotificationTokenBodyDTO {
  @IsOptional()
  @IsString()
  token?: string | null;
}

export class UpdatePushNotificationTokenDTO extends UserIdDTO {
  @IsOptional()
  @IsString()
  token?: string | null;
}
