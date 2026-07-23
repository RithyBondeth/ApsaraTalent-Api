import 'reflect-metadata';
import { isUuid, resolveUserId, resolveUserIdSafe } from '@app/common';
import { RpcException } from '@nestjs/microservices';
import { of } from 'rxjs';
import { ChatService } from './chat-service.service';

jest.mock('@app/common', () => ({
  isUuid: jest.fn(() => true),
  resolveUserId: jest.fn(),
  resolveUserIdSafe: jest.fn(),
}));

describe('ChatService', () => {
  const chats = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const users = { findOne: jest.fn() };
  const blocks = { exists: jest.fn() };
  const userClient = { send: jest.fn() };
  const redis = {
    invalidateChatCaches: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    generateUnreadCountKey: jest.fn((id) => `unread:${id}`),
    generateRecentChatsKey: jest.fn((id) => `recent:${id}`),
  };
  const logger = {
    setContext: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
  const service = new ChatService(
    chats as any,
    users as any,
    blocks as any,
    userClient as any,
    redis as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (resolveUserId as jest.Mock).mockImplementation(async (_repo, id) => id);
    (resolveUserIdSafe as jest.Mock).mockImplementation(
      async (_repo, id) => id,
    );
    blocks.exists.mockResolvedValue(false);
    redis.get.mockResolvedValue(null);
  });

  it('returns an existing conversation without creating a placeholder', async () => {
    users.findOne.mockResolvedValue({
      id: 'receiver',
      email: 'r@example.com',
      employee: { firstname: 'Sok', lastname: 'Dara' },
    });
    chats.findOne.mockResolvedValue({ id: 'chat-1' });
    const result = await service.createOrGetChat({
      senderId: 'sender',
      receiverId: 'receiver',
    });
    expect(result.alreadyExists).toBe(true);
    expect(chats.save).not.toHaveBeenCalled();
  });

  it('creates a conversation and invalidates both participants’ caches', async () => {
    users.findOne.mockResolvedValue({
      id: 'receiver',
      company: { name: 'Apsara' },
    });
    chats.findOne.mockResolvedValue(null);
    chats.save.mockResolvedValue({ id: 'chat-1' });
    const result = await service.createOrGetChat({
      senderId: 'sender',
      receiverId: 'receiver',
    });
    expect(result.alreadyExists).toBe(false);
    expect(redis.invalidateChatCaches).toHaveBeenCalledWith(
      'sender',
      'receiver',
    );
  });

  it('blocks conversation creation in either block direction', async () => {
    blocks.exists.mockResolvedValue(true);
    const error = (await service
      .createOrGetChat({
        senderId: 'sender',
        receiverId: 'receiver',
      })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 403,
      message: 'You can no longer message this user.',
    });
  });

  it('preserves the blocked-user 403 when sending a message', async () => {
    blocks.exists.mockResolvedValue(true);
    const error = (await service
      .createMessage({
        senderId: 'sender',
        receiverId: 'receiver',
        content: 'Hello',
      })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 403,
      message: 'You can no longer message this user.',
    });
  });

  it('creates and reloads a message with attachment metadata', async () => {
    chats.save.mockResolvedValue({ id: 'message-1' });
    chats.findOne.mockResolvedValue({
      id: 'message-1',
      content: 'Photo',
      messageType: 'image',
      isRead: false,
      sender: {
        id: 'sender',
        employee: { firstname: 'Sok' },
        email: 's@example.com',
      },
      receiver: {
        id: 'receiver',
        company: { name: 'Apsara' },
        email: 'r@example.com',
      },
      attachment: '/storage/chat/photo.png',
      reactions: {},
    });
    const result = await service.createMessage({
      senderId: 'sender',
      receiverId: 'receiver',
      content: 'Photo',
      type: 'image',
      attachment: '/storage/chat/photo.png',
    });
    expect(result.attachmentType).toBe('image');
    expect(redis.invalidateChatCaches).toHaveBeenCalled();
  });

  it('only allows the sender to edit and delete messages', async () => {
    chats.findOne.mockResolvedValue({
      id: 'message-1',
      sender: { id: 'sender' },
      receiver: { id: 'receiver' },
      isDeleted: false,
    });
    await service.editMessage({
      requesterId: 'sender',
      messageId: 'message-1',
      newContent: ' Edited ',
    });
    expect(chats.update).toHaveBeenCalledWith('message-1', {
      content: 'Edited',
      isEdited: true,
    });
    await service.deleteMessage({
      requesterId: 'sender',
      messageId: 'message-1',
    });
    expect(chats.update).toHaveBeenCalledWith('message-1', { isDeleted: true });
  });

  it('rejects edits by a different user', async () => {
    chats.findOne.mockResolvedValue({
      sender: { id: 'owner' },
      receiver: { id: 'receiver' },
    });
    const error = (await service
      .editMessage({
        requesterId: 'outsider',
        messageId: 'message-1',
        newContent: 'Edit',
      })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it('marks only receiver-owned messages read and clears unread cache', async () => {
    chats.update.mockResolvedValue({ affected: 1 });
    await service.markAsRead({ messageId: 'message-1', readerId: 'receiver' });
    expect(redis.del).toHaveBeenCalledWith('unread:receiver');
  });

  it('validates chat users through the user service', async () => {
    userClient.send
      .mockReturnValueOnce(of({ id: 'sender' }))
      .mockReturnValueOnce(of({ id: 'receiver' }));
    const result = await service.validateChatUsers({
      senderId: 'sender',
      receiverId: 'receiver',
    });
    expect(result.sender.id).toBe('sender');
    expect(result.receiver.id).toBe('receiver');
  });

  it('uses cached unread counts and caches database counts', async () => {
    redis.get.mockResolvedValueOnce(3);
    await expect(service.getUnreadCount('user-1')).resolves.toBe(3);
    chats.count.mockResolvedValue(4);
    redis.get.mockResolvedValueOnce(null);
    await expect(service.getUnreadCount('user-1')).resolves.toBe(4);
    expect(redis.set).toHaveBeenCalledWith(
      'unread:user-1',
      4,
      expect.any(Number),
    );
  });

  it('adds and removes reactions by user', async () => {
    const message = { id: 'message-1', reactions: {} };
    chats.findOne.mockResolvedValue(message);
    const added = await service.updateReaction({
      messageId: 'message-1',
      userId: 'user-1',
      emoji: '👍',
    });
    expect(added.reactions).toEqual({ 'user-1': '👍' });
    const removed = await service.updateReaction({
      messageId: 'message-1',
      userId: 'user-1',
      emoji: null,
    });
    expect(removed.reactions).toEqual({});
  });

  it('rejects read receipts for missing or unauthorized messages', async () => {
    chats.update.mockResolvedValue({ affected: 0 });
    await expect(
      service.markAsRead({ messageId: 'message-1', readerId: 'outsider' }),
    ).rejects.toThrow('Message not found or user not authorized');
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('loads users through the user-service RPC boundary', async () => {
    userClient.send.mockReturnValue(
      of({ id: 'user-1', email: 'person@example.com' }),
    );
    await expect(service.getUserByIdForChat('user-1')).resolves.toEqual(
      expect.objectContaining({ id: 'user-1', email: 'person@example.com' }),
    );
  });

  it('formats paginated chat history and attachment metadata', async () => {
    chats.find.mockResolvedValue([
      {
        id: 'message-1',
        sender: {
          id: 'sender',
          employee: { firstname: 'Sok', lastname: 'Dara' },
        },
        receiver: { id: 'receiver', company: { name: 'Apsara' } },
        content: 'Audio',
        messageType: 'audio',
        isRead: true,
        sentAt: new Date('2026-01-01'),
        reactions: null,
        attachment: '/storage/chat/audio.webm',
        attachmentFilename: 'audio.webm',
        attachmentDuration: 12,
      },
    ]);
    userClient.send.mockReturnValue(
      of({ id: 'receiver', email: 'receiver@example.com' }),
    );
    const result = await service.getChatHistory({
      userId1: 'sender',
      userId2: 'receiver',
      limit: 999,
      offset: -5,
    });
    expect(chats.find).toHaveBeenCalledWith(
      expect.objectContaining({ take: expect.any(Number), skip: 0 }),
    );
    expect(result.messages[0]).toEqual(
      expect.objectContaining({
        senderName: 'Sok Dara',
        attachmentType: 'audio',
        reactions: {},
      }),
    );
  });

  it('authorizes attachments only for message participants', async () => {
    await expect(
      service.canAccessAttachment('', '/storage/file.pdf'),
    ).resolves.toBe(false);
    chats.findOne.mockResolvedValue({
      sender: { id: 'sender' },
      receiver: { id: 'receiver' },
    });
    await expect(
      service.canAccessAttachment('sender', '/storage/file.pdf'),
    ).resolves.toBe(true);
    await expect(
      service.canAccessAttachment('outsider', '/storage/file.pdf'),
    ).resolves.toBe(false);
  });

  it('rejects reactions for missing messages', async () => {
    chats.findOne.mockResolvedValue(null);
    await expect(
      service.updateReaction({
        messageId: 'missing',
        userId: 'user-1',
        emoji: '👍',
      }),
    ).rejects.toThrow('Message not found');
  });

  it('returns recent chats from cache and from the ordered database query', async () => {
    redis.get.mockResolvedValueOnce([{ id: 'cached-chat' }]);
    await expect(service.getRecentChats('user-1')).resolves.toEqual([
      { id: 'cached-chat' },
    ]);

    redis.get.mockResolvedValueOnce(null);
    const qb: any = {};
    for (const method of [
      'leftJoinAndSelect',
      'where',
      'orWhere',
      'orderBy',
      'addOrderBy',
      'take',
    ]) {
      qb[method] = jest.fn(() => qb);
    }
    qb.getMany = jest.fn().mockResolvedValue([
      {
        id: 'chat-1',
        sender: { id: 'user-1' },
        receiver: { id: 'user-2' },
        content: 'Hello',
      },
    ]);
    chats.createQueryBuilder.mockReturnValue(qb);
    const result = await service.getRecentChats('user-1');
    expect(result).toHaveLength(1);
    expect(redis.set).toHaveBeenCalledWith(
      'recent:user-1',
      expect.any(Array),
      expect.any(Number),
    );
  });

  it('returns no recent chats when identity resolution yields no UUID', async () => {
    (isUuid as jest.Mock).mockReturnValue(false);
    (resolveUserIdSafe as jest.Mock).mockResolvedValue(null);
    await expect(service.getRecentChats('bad-id')).resolves.toEqual([]);
    expect(chats.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('wraps identity-resolution and partner lookup failures', async () => {
    (resolveUserId as jest.Mock).mockRejectedValueOnce(new Error('missing'));
    const unresolved = (await service
      .createOrGetChat({ senderId: 'bad', receiverId: 'receiver' })
      .catch((error) => error)) as RpcException;
    expect(unresolved.getError()).toEqual({
      message: 'Could not resolve user ID from: bad',
      statusCode: 404,
    });

    users.findOne.mockResolvedValueOnce(null);
    const missingPartner = (await service
      .createOrGetChat({ senderId: 'sender', receiverId: 'receiver' })
      .catch((error) => error)) as RpcException;
    expect(missingPartner.getError()).toEqual({
      message: 'Failed to create chat: Partner user not found',
      statusCode: 500,
    });
  });

  it('handles a message disappearing after it is saved', async () => {
    chats.save.mockResolvedValueOnce({ id: 'message-1' });
    chats.findOne.mockResolvedValueOnce(null);
    const error = (await service
      .createMessage({
        senderId: 'sender',
        receiverId: 'receiver',
        content: 'Hello',
      })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      message: 'Failed to create message: Failed to retrieve saved message',
      statusCode: 500,
    });
  });

  it('rejects empty, oversized, missing, and deleted message edits', async () => {
    await expect(
      service.editMessage({
        requesterId: 'sender',
        messageId: 'message-1',
        newContent: '   ',
      }),
    ).rejects.toBeInstanceOf(RpcException);
    await expect(
      service.editMessage({
        requesterId: 'sender',
        messageId: 'message-1',
        newContent: 'x'.repeat(5001),
      }),
    ).rejects.toBeInstanceOf(RpcException);

    chats.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      sender: { id: 'sender' },
      receiver: { id: 'receiver' },
      isDeleted: true,
    });
    await expect(
      service.editMessage({
        requesterId: 'sender',
        messageId: 'missing',
        newContent: 'valid',
      }),
    ).rejects.toBeInstanceOf(RpcException);
    const deleted = (await service
      .editMessage({
        requesterId: 'sender',
        messageId: 'message-1',
        newContent: 'valid',
      })
      .catch((error) => error)) as RpcException;
    expect(deleted.getError()).toEqual({
      message: 'Cannot edit a deleted message',
      statusCode: 400,
    });
  });

  it('rejects missing and unauthorized message deletions', async () => {
    chats.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      sender: { id: 'owner' },
      receiver: { id: 'receiver' },
    });
    await expect(
      service.deleteMessage({ requesterId: 'sender', messageId: 'missing' }),
    ).rejects.toBeInstanceOf(RpcException);
    const unauthorized = (await service
      .deleteMessage({ requesterId: 'sender', messageId: 'message-1' })
      .catch((error) => error)) as RpcException;
    expect(unauthorized.getError()).toEqual({
      message: 'Not authorized to delete this message',
      statusCode: 403,
    });
  });

  it('waits for both concurrent user lookups and rejects an absent result', async () => {
    const getUser = jest
      .spyOn(service, 'getUserByIdForChat')
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce({ id: 'receiver' } as any);
    const error = (await service
      .validateChatUsers({ senderId: 'sender', receiverId: 'receiver' })
      .catch((caught) => caught)) as RpcException;
    expect(getUser).toHaveBeenCalledTimes(2);
    expect(error.getError()).toEqual({
      message: 'One or both users not found',
      statusCode: 400,
    });
  });

  it('builds every legacy and canonical history direction', async () => {
    (resolveUserId as jest.Mock)
      .mockResolvedValueOnce('canonical-1')
      .mockResolvedValueOnce('canonical-2');
    chats.find.mockResolvedValueOnce([]);
    userClient.send.mockReturnValueOnce(of({ id: 'canonical-2' }));

    await service.getChatHistory({
      userId1: 'legacy-1',
      userId2: 'legacy-2',
    });
    expect(chats.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.any(Array) }),
    );
    expect(chats.find.mock.calls.at(-1)?.[0].where).toHaveLength(8);
  });
});
