import { IsNotEmpty, IsString } from 'class-validator';
export class NotificationActionResponseDTO {
  success: boolean;
  affected?: number;
}

export class NotificationActionDTO {
  @IsString() @IsNotEmpty() id?: string;
}
