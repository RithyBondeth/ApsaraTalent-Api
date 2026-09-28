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
  DeviceTokenBodyDTO,
  DeviceTokenDTO,
  DeviceTokenResponseDTO,
} from '@app/contracts/dtos';

export interface INotificationController {
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
    createNotificationCurrentUserDTO: CreateNotificationCurrentUserDTO,
  ): Promise<CreateNotificationCurrentUserResponseDTO>;
  registerDeviceToken(
    req: any,
    body: DeviceTokenBodyDTO,
  ): Promise<DeviceTokenResponseDTO>;
  removeDeviceToken(
    req: any,
    body: DeviceTokenBodyDTO,
  ): Promise<DeviceTokenResponseDTO>;
}

export interface INotificationRpcController {
  getAllNotification(): Promise<GetAllNotificationResponseDTO[]>;
  listByUser(
    listNotificationsDTO: ListNotificationsDTO,
  ): Promise<NotificationListByUserResponseDTO>;
  getUnreadCount(
    notificationUserDTO: NotificationUserDTO,
  ): Promise<UnreadCountResponseDTO>;
  markRead(
    notificationIdDTO: NotificationIdDTO,
  ): Promise<MarkNotificationAsReadResponseDTO>;
  markAllRead(
    notificationUserDTO: NotificationUserDTO,
  ): Promise<ReadAllNotificationResponseDTO>;
  createForCurrentUser(
    createNotificationCurrentUserDTO: CreateNotificationCurrentUserDTO,
  ): Promise<CreateNotificationCurrentUserResponseDTO>;
  deleteNotification(
    notificationIdDTO: NotificationIdDTO,
  ): Promise<DeleteNotificationResponseDTO>;
  deleteAllNotifications(
    notificationUserDTO: NotificationUserDTO,
  ): Promise<DeleteNotificationResponseDTO>;
  registerDeviceToken(
    deviceTokenDTO: DeviceTokenDTO,
  ): Promise<DeviceTokenResponseDTO>;
  removeDeviceToken(
    deviceTokenDTO: DeviceTokenDTO,
  ): Promise<DeviceTokenResponseDTO>;
}
