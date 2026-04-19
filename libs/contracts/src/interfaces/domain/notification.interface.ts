import {
  CreateNotificationCurrentUserDTO,
  CreateNotificationCurrentUserResponseDTO,
  DeleteNotificationResponseDTO,
  GetAllNotificationResponseDTO,
  ListNotificationsDTO,
  ListNotificationsQueryDTO,
  MarkNotificationAsReadResponseDTO,
  NotificationIdDTO,
  NotificationUserDTO,
  NotificationListByUserResponseDTO,
  ReadAllNotificationResponseDTO,
  UnreadCountResponseDTO,
} from '@app/contracts/dtos';

export interface INotificationController {
  getAllNotification(): Promise<GetAllNotificationResponseDTO[]>;
  listByUser(
    req: any,
    query: ListNotificationsQueryDTO,
  ): Promise<NotificationListByUserResponseDTO>;
  getUnreadCount(req: any): Promise<UnreadCountResponseDTO>;
  markRead(req: any, id: string): Promise<MarkNotificationAsReadResponseDTO>;
  markAllRead(req: any): Promise<ReadAllNotificationResponseDTO>;
  deleteNotification(
    req: any,
    id: string,
  ): Promise<DeleteNotificationResponseDTO>;
  deleteAllNotifications(req: any): Promise<DeleteNotificationResponseDTO>;
  createForCurrentUser(
    req: any,
    body: CreateNotificationCurrentUserDTO,
  ): Promise<CreateNotificationCurrentUserResponseDTO>;
}

export interface INotificationRpcController {
  getAllNotification(): Promise<GetAllNotificationResponseDTO[]>;
  listByUser(payload: ListNotificationsDTO): Promise<NotificationListByUserResponseDTO>;
  getUnreadCount(payload: NotificationUserDTO): Promise<UnreadCountResponseDTO>;
  markRead(payload: NotificationIdDTO): Promise<MarkNotificationAsReadResponseDTO>;
  markAllRead(payload: NotificationUserDTO): Promise<ReadAllNotificationResponseDTO>;
  deleteNotification(
    payload: NotificationIdDTO,
  ): Promise<DeleteNotificationResponseDTO>;
  deleteAllNotifications(
    payload: NotificationUserDTO,
  ): Promise<DeleteNotificationResponseDTO>;
  createForCurrentUser(
    body: CreateNotificationCurrentUserDTO,
  ): Promise<CreateNotificationCurrentUserResponseDTO>;
}
