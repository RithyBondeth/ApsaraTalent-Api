import { NotificationController } from './notification-service.controller';

describe('RPC NotificationController', () => {
  const service: Record<string, jest.Mock> = {};
  for (const method of [
    'findAllNotification',
    'listByUser',
    'getUnreadCount',
    'markRead',
    'markAllRead',
    'createNotification',
    'deleteNotification',
    'deleteAllNotifications',
  ])
    service[method] = jest.fn().mockResolvedValue({ success: true });
  const controller = new NotificationController(service as any);

  beforeEach(() => jest.clearAllMocks());

  it('delegates every RPC action to the notification service', async () => {
    await controller.getAllNotification();
    expect(service.findAllNotification).toHaveBeenCalled();
    const cases: Array<[string, string]> = [
      ['listByUser', 'listByUser'],
      ['getUnreadCount', 'getUnreadCount'],
      ['markRead', 'markRead'],
      ['markAllRead', 'markAllRead'],
      ['createForCurrentUser', 'createNotification'],
      ['deleteNotification', 'deleteNotification'],
      ['deleteAllNotifications', 'deleteAllNotifications'],
    ];
    for (const [controllerMethod, serviceMethod] of cases) {
      const payload = { userId: 'user-1' } as any;
      await (controller as any)[controllerMethod](payload);
      expect(service[serviceMethod]).toHaveBeenLastCalledWith(payload);
    }
  });
});
