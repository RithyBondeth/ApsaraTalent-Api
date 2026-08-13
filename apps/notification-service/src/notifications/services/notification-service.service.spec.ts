import { RpcException } from '@nestjs/microservices';
import { NotificationService } from './notification-service.service';
import {
  generateNotificationListKey,
  generateNotificationUnreadCountKey,
} from '@app/common/redis/redis-keys.util';

describe('NotificationService', () => {
  const notifications = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  };
  const users = { findOne: jest.fn() };
  const push = { sendToToken: jest.fn() };
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
  const redis = {
    invalidateNotificationCaches: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  };
  const service = new NotificationService(
    notifications as any,
    users as any,
    push as any,
    logger as any,
    redis as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
  });

  const entity = (overrides: Record<string, unknown> = {}) => ({
    id: 'n1',
    title: 'Title',
    message: 'Message',
    type: 'chat',
    data: { chatId: 'c1' },
    isRead: false,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  });

  it('creates an unread notification and invalidates the recipient cache', async () => {
    const created = entity();
    notifications.create.mockReturnValue(created);
    notifications.save.mockResolvedValue(created);

    await service.createNotification({
      userId: 'u1',
      title: 'Title',
      message: 'Message',
    });

    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: 'u1' }, isRead: false }),
    );
    expect(redis.invalidateNotificationCaches).toHaveBeenCalledWith('u1');
    expect(push.sendToToken).not.toHaveBeenCalled();
  });

  it('lists the latest notifications as response DTOs', async () => {
    notifications.find.mockResolvedValue([entity(), entity({ id: 'n2' })]);
    const result = await service.findAllNotification();
    expect(notifications.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      take: 100,
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'n1', isRead: false });
  });

  it('sends push data only to the stored recipient device token', async () => {
    const created = entity();
    notifications.create.mockReturnValue(created);
    notifications.save.mockResolvedValue(created);
    users.findOne.mockResolvedValue({ pushNotificationToken: 'device-token' });
    push.sendToToken.mockResolvedValue({ success: true });

    await service.createNotification({
      userId: 'u1',
      title: 'Title',
      message: 'Message',
      type: 'chat',
      data: { chatId: 'c1' },
      sendPush: true,
    });

    expect(users.findOne).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(push.sendToToken).toHaveBeenCalledWith(
      'device-token',
      expect.objectContaining({
        title: 'Title',
        data: expect.objectContaining({ targetUserId: 'u1', type: 'chat' }),
      }),
    );
  });

  it('keeps the persisted notification when optional push delivery fails', async () => {
    const created = entity();
    notifications.create.mockReturnValue(created);
    notifications.save.mockResolvedValue(created);
    users.findOne.mockResolvedValue({ pushNotificationToken: 'device-token' });
    push.sendToToken.mockRejectedValue(new Error('firebase down'));

    await expect(
      service.createNotification({
        userId: 'u1',
        title: 'Title',
        message: 'Message',
        sendPush: true,
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 'n1' }));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('firebase down'),
    );
  });

  it('logs missing tokens, successful pushes, skipped pushes, and unknown errors', async () => {
    const created = entity();
    notifications.create.mockReturnValue(created);
    notifications.save.mockResolvedValue(created);

    users.findOne.mockResolvedValueOnce(null);
    await service.createNotification({
      userId: 'u1',
      title: 'Title',
      message: 'Message',
      sendPush: true,
    });
    expect(logger.warn).toHaveBeenLastCalledWith(
      'Push skipped: no token for userId=u1',
    );

    users.findOne.mockResolvedValue({ pushNotificationToken: 'device-token' });
    push.sendToToken.mockResolvedValueOnce({ success: true });
    await service.createNotification({
      userId: 'u1',
      title: 'Title',
      message: 'Message',
      sendPush: true,
    });
    expect(logger.info).toHaveBeenLastCalledWith(
      expect.stringContaining('Push sent to userId=u1'),
    );

    push.sendToToken.mockResolvedValueOnce({
      skipped: true,
      reason: 'disabled',
    });
    await service.createNotification({
      userId: 'u1',
      title: 'Title',
      message: 'Message',
      sendPush: true,
    });
    expect(logger.warn).toHaveBeenLastCalledWith(
      'Push skipped for userId=u1: disabled',
    );

    push.sendToToken.mockRejectedValueOnce('unknown failure');
    await service.createNotification({
      userId: 'u1',
      title: 'Title',
      message: 'Message',
      sendPush: true,
    });
    expect(logger.warn).toHaveBeenLastCalledWith(
      'Push notification failed: Unknown error',
    );
  });

  it('returns a cached user list without querying the database', async () => {
    const cached = { items: [entity()], total: 1, page: 1, limit: 20 };
    redis.get.mockResolvedValue(cached);
    await expect(service.listByUser({ userId: 'u1' })).resolves.toBe(cached);
    expect(notifications.findAndCount).not.toHaveBeenCalled();
  });

  it('clamps pagination, scopes by user, and caches a database list', async () => {
    notifications.findAndCount.mockResolvedValue([[entity()], 1]);
    const result = await service.listByUser({
      userId: 'u1',
      page: -2,
      limit: 9999,
      unreadOnly: true,
    });
    expect(notifications.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user: { id: 'u1' }, isRead: false },
        skip: 0,
      }),
    );
    expect(redis.set).toHaveBeenCalledWith(
      generateNotificationListKey('u1', 1, 100, true),
      result,
      expect.any(Number),
    );
  });

  it.each([
    ['markRead', 'update'],
    ['deleteNotification', 'delete'],
  ] as const)(
    "%s cannot mutate another user's missing notification",
    async (method, repoMethod) => {
      notifications[repoMethod].mockResolvedValue({ affected: 0 });
      await expect(
        service[method]({ notificationId: 'n1', userId: 'attacker' }),
      ).rejects.toBeInstanceOf(RpcException);
      expect(redis.invalidateNotificationCaches).not.toHaveBeenCalled();
    },
  );

  it('caches unread counts independently per authenticated user', async () => {
    notifications.count.mockResolvedValue(4);
    const result = await service.getUnreadCount({ userId: 'u1' });
    expect(notifications.count).toHaveBeenCalledWith({
      where: { user: { id: 'u1' }, isRead: false },
    });
    expect(result).toEqual(expect.objectContaining({ unreadCount: 4 }));
    expect(redis.set).toHaveBeenCalledWith(
      generateNotificationUnreadCountKey('u1'),
      result,
      expect.any(Number),
    );
  });

  it('returns cached unread counts without querying storage', async () => {
    redis.get.mockResolvedValue({ unreadCount: 9 });
    await expect(service.getUnreadCount({ userId: 'u1' })).resolves.toEqual({
      unreadCount: 9,
    });
    expect(notifications.count).not.toHaveBeenCalled();
  });

  it('invalidates caches after successful single and bulk mutations', async () => {
    notifications.update
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: undefined });
    notifications.delete
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: undefined });

    await expect(
      service.markRead({ notificationId: 'n1', userId: 'u1' }),
    ).resolves.toMatchObject({ success: true });
    await expect(service.markAllRead({ userId: 'u1' })).resolves.toMatchObject({
      success: true,
      affected: 0,
    });
    await expect(
      service.deleteNotification({ notificationId: 'n1', userId: 'u1' }),
    ).resolves.toMatchObject({ success: true });
    await expect(
      service.deleteAllNotifications({ userId: 'u1' }),
    ).resolves.toMatchObject({ success: true, affected: 0 });
    expect(redis.invalidateNotificationCaches).toHaveBeenCalledTimes(4);
  });
});
