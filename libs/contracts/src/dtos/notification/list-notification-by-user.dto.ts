import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { GetAllNotificationResponseDTO } from './get-all-notification.dto';

export class NotificationListByUserResponseDTO {
  items: GetAllNotificationResponseDTO[];
  total: number;
  page: number;
  limit: number;

  constructor(partial: Partial<NotificationListByUserResponseDTO>) {
    Object.assign(this, partial);
  }
}

// export class ListNotificationsByUserDTO {
//   @IsNumber() @IsOptional() @Type(() => Number) page?: number;
//   @IsNumber() @IsOptional() @Type(() => Number) limit?: number;
//   @IsBoolean() @IsOptional() unreadOnly?: boolean;
// }
