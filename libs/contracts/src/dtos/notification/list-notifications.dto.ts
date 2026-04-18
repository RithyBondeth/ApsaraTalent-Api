import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { NotificationResponseDTO } from './notification.dto';

export class NotificationListResponseDTO {
  items: NotificationResponseDTO[];
  total: number;
  page: number;
  limit: number;

    constructor(partial: Partial<NotificationListResponseDTO>) {
        Object.assign(this, partial);
    }
}

export class ListNotificationsDTO {
  @IsNumber() @IsOptional() @Type(() => Number) page?: number;
  @IsNumber() @IsOptional() @Type(() => Number) limit?: number;
  @IsBoolean() @IsOptional() unreadOnly?: boolean;
}
