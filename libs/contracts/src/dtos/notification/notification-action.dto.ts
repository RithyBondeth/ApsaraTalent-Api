import { IsNotEmpty, IsString } from 'class-validator';
export class NotificationActionResponseDTO {
  success: boolean;
  affected?: number;

    constructor(partial: Partial<NotificationActionResponseDTO>) {
        Object.assign(this, partial);
    }
}

export class NotificationActionDTO {
  @IsString() @IsNotEmpty() id?: string;
}
