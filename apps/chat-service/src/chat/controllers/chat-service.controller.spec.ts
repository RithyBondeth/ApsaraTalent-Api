import { ChatController } from './chat-service.controller';

describe('ChatController', () => {
  const service: Record<string, jest.Mock> = {};
  for (const method of [
    'createOrGetChat',
    'createMessage',
    'markAsRead',
    'getUserByIdForChat',
    'canAccessAttachment',
    'validateChatUsers',
    'getChatHistory',
    'getUnreadCount',
    'getRecentChats',
    'updateReaction',
    'editMessage',
    'deleteMessage',
  ]) {
    service[method] = jest.fn();
  }
  const logger = { setContext: jest.fn(), info: jest.fn() };
  // The controller now takes the write and read services separately; this
  // suite only asserts delegation, so one mock carrying every method serves as
  // both collaborators.
  const controller = new ChatController(
    service as any,
    service as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    for (const mock of Object.values(service))
      mock.mockResolvedValue({ success: true });
  });

  it('delegates chat commands without changing their payloads', async () => {
    const cases: Array<[string, string, any]> = [
      [
        'createOrGetChat',
        'createOrGetChat',
        { senderId: 'a', receiverId: 'b' },
      ],
      ['createMessage', 'createMessage', { senderId: 'a', content: 'hello' }],
      ['markAsRead', 'markAsRead', { messageId: 'm', readerId: 'b' }],
      ['getChatHistory', 'getChatHistory', { userId1: 'a', userId2: 'b' }],
      ['updateReaction', 'updateReaction', { messageId: 'm', emoji: '👍' }],
      ['editMessage', 'editMessage', { messageId: 'm', newContent: 'new' }],
      ['deleteMessage', 'deleteMessage', { messageId: 'm' }],
    ];
    for (const [controllerMethod, serviceMethod, payload] of cases) {
      await (controller as any)[controllerMethod](payload);
      expect(service[serviceMethod]).toHaveBeenLastCalledWith(payload);
    }
  });

  it('delegates user lookups, unread counts, and recent chats', async () => {
    service.getUserByIdForChat.mockResolvedValue({ id: 'user-1' });
    await expect(controller.getUserByIdForChat('user-1')).resolves.toEqual({
      id: 'user-1',
    });
    service.getUnreadCount.mockResolvedValue(3);
    await expect(controller.getUnreadCount('user-1')).resolves.toBe(3);
    service.getRecentChats.mockResolvedValue([]);
    await expect(controller.getRecentChats('user-1')).resolves.toEqual([]);
    expect(logger.info).toHaveBeenCalled();
  });

  it('wraps attachment authorization and validates chat users', async () => {
    service.canAccessAttachment.mockResolvedValue(true);
    await expect(
      controller.canAccessAttachment({
        userId: 'user-1',
        attachment: '/storage/file.pdf',
      }),
    ).resolves.toEqual(expect.objectContaining({ canAccess: true }));
    service.validateChatUsers.mockResolvedValue({
      sender: { email: 'sender@example.com' },
      receiver: { email: 'receiver@example.com' },
    });
    await expect(
      controller.validateChatUsers({ senderId: 'a', receiverId: 'b' }),
    ).resolves.toEqual(expect.objectContaining({ sender: expect.any(Object) }));
  });
});
