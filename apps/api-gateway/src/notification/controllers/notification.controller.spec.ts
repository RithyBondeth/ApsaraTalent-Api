import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import { rpcCall } from '../../utils/rpc-call';
import { NotificationController } from './notification.controller';

jest.mock('../../utils/rpc-call', () => ({ rpcCall: jest.fn() }));

describe('Gateway NotificationController', () => {
  const client = {};
  const controller = new NotificationController(client as any);
  const req = { user: { id: 'user-1' } };

  beforeEach(() => (rpcCall as jest.Mock).mockResolvedValue({ success: true }));

  it('binds every notification operation to the current user', async () => {
    const cases: Array<[() => Promise<any>, any, any]> = [
      [
        () => controller.listByUser(req, { page: 1, limit: 5 }),
        NOTIFICATION_SERVICE.ACTIONS.LIST_BY_USER,
        { userId: 'user-1', page: 1, limit: 5 },
      ],
      [
        () => controller.getUnreadCount(req),
        NOTIFICATION_SERVICE.ACTIONS.GET_UNREAD_COUNT,
        { userId: 'user-1' },
      ],
      [
        () => controller.markRead(req, 'notification-1'),
        NOTIFICATION_SERVICE.ACTIONS.MARK_READ,
        { userId: 'user-1', notificationId: 'notification-1' },
      ],
      [
        () => controller.markAllRead(req),
        NOTIFICATION_SERVICE.ACTIONS.MARK_ALL_READ,
        { userId: 'user-1' },
      ],
      [
        () => controller.deleteNotification(req, 'notification-1'),
        NOTIFICATION_SERVICE.ACTIONS.DELETE_NOTIFICATION,
        { userId: 'user-1', notificationId: 'notification-1' },
      ],
      [
        () => controller.deleteAllNotifications(req),
        NOTIFICATION_SERVICE.ACTIONS.DELETE_ALL_NOTIFICATIONS,
        { userId: 'user-1' },
      ],
    ];
    for (const [invoke, action, payload] of cases) {
      await invoke();
      expect(rpcCall).toHaveBeenLastCalledWith(client, action, payload);
    }
    const dto = {
      title: 'Hello',
      message: 'World',
      type: 'info',
      data: { id: 1 },
    } as any;
    await controller.createForCurrentUser(req, dto);
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
      {
        userId: 'user-1',
        ...dto,
      },
    );
  });
});
