import 'reflect-metadata';
import { CHAT, CHAT_SERVICE, CHAT_WEBSOCKET_EVENTS } from '@app/contracts';
import { of, throwError } from 'rxjs';
import { ChatGateway } from './chat.gateway';

describe('ChatGateway', () => {
  const jwt = { verifyToken: jest.fn() };
  const socketState = {
    addSocket: jest.fn(),
    removeSocket: jest.fn(),
    isOnline: jest.fn(),
  };
  const rateLimiter = { isRateLimited: jest.fn() };
  const notifications = { notifyChatMessage: jest.fn() };
  const broadcast = { setServer: jest.fn() };
  const messages = { sendMessage: jest.fn() };
  const chatClient = { send: jest.fn() };
  const gateway = new ChatGateway(
    jwt as any,
    socketState as any,
    rateLimiter as any,
    notifications as any,
    broadcast as any,
    messages as any,
    chatClient as any,
  );
  const roomEmit = jest.fn();
  const server = {
    emit: jest.fn(),
    to: jest.fn(() => ({ emit: roomEmit })),
  } as any;

  function client(token?: string, userId?: string) {
    return {
      id: 'socket-1',
      data: { userId },
      handshake: { auth: token ? { token } : {}, headers: {}, query: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
    } as any;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    gateway.server = server;
    rateLimiter.isRateLimited.mockReturnValue(false);
  });

  it('registers the Socket.IO server for cross-service broadcasts', () => {
    gateway.afterInit(server);
    expect(broadcast.setServer).toHaveBeenCalledWith(server);
  });

  it('disconnects connections without a token', async () => {
    const socket = client();
    await gateway.handleConnection(socket);
    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'Authentication required',
    });
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('authenticates, joins the user room, and announces first connection', async () => {
    jwt.verifyToken.mockResolvedValue({ id: 'user-1' });
    socketState.addSocket.mockReturnValue(true);
    const socket = client('access-token');
    await gateway.handleConnection(socket);
    expect(jwt.verifyToken).toHaveBeenCalledWith('access-token');
    expect(socket.join).toHaveBeenCalledWith('user-1');
    expect(server.emit).toHaveBeenCalledWith(
      CHAT_WEBSOCKET_EVENTS.USER_STATUS,
      {
        userId: 'user-1',
        status: 'online',
      },
    );
  });

  it('disconnects invalid tokens without adding socket state', async () => {
    jwt.verifyToken.mockRejectedValue(new Error('expired'));
    const socket = client('bad-token');
    await gateway.handleConnection(socket);
    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(socketState.addSocket).not.toHaveBeenCalled();
  });

  it('announces offline only after the final socket disconnects', async () => {
    socketState.removeSocket.mockReturnValue(true);
    await gateway.handleDisconnect(client(undefined, 'user-1'));
    expect(server.emit).toHaveBeenCalledWith(
      CHAT_WEBSOCKET_EVENTS.USER_STATUS,
      {
        userId: 'user-1',
        status: 'offline',
      },
    );
  });

  it('rejects unauthorized, rate-limited, empty, and invalid-type messages', async () => {
    const anonymous = client();
    await gateway.handleMessage(anonymous, {
      receiverId: 'receiver',
      content: 'Hi',
    });
    expect(anonymous.emit).toHaveBeenCalledWith('error', {
      message: 'Unauthorized',
    });

    const sender = client(undefined, 'sender');
    rateLimiter.isRateLimited.mockReturnValueOnce(true);
    await gateway.handleMessage(sender, {
      receiverId: 'receiver',
      content: 'Hi',
    });
    expect(sender.emit).toHaveBeenCalledWith('error', {
      message: 'Too many messages — slow down',
    });
    rateLimiter.isRateLimited.mockReturnValue(false);
    await gateway.handleMessage(sender, {
      receiverId: 'receiver',
      content: '   ',
    });
    expect(sender.emit).toHaveBeenCalledWith('error', {
      message: 'Message cannot be empty',
    });
    await gateway.handleMessage(sender, {
      receiverId: 'receiver',
      content: 'Hi',
      type: 'invalid' as any,
    });
    expect(sender.emit).toHaveBeenCalledWith('error', {
      message: 'Invalid message type',
    });
  });

  it('sends and broadcasts valid messages to both perspectives', async () => {
    messages.sendMessage.mockResolvedValue({
      usersData: {
        sender: { id: 'sender', email: 's@example.com' },
        receiver: { id: 'receiver', email: 'r@example.com' },
      },
      savedMessage: { id: 'message-1', content: 'Hello' },
    });
    const result = await gateway.handleMessage(client(undefined, 'sender'), {
      receiverId: 'receiver',
      content: ' Hello ',
    });
    expect(server.to).toHaveBeenCalledWith('receiver');
    expect(server.to).toHaveBeenCalledWith('sender');
    expect(roomEmit).toHaveBeenCalledWith(
      CHAT_WEBSOCKET_EVENTS.NEW_MESSAGE,
      expect.objectContaining({ isMe: false }),
    );
    expect(result).toEqual(expect.objectContaining({ status: 'sent' }));
  });

  it('broadcasts typing and contains chat-service failures', async () => {
    await gateway.handleTyping(client(undefined, 'sender'), {
      receiverId: 'receiver',
      isTyping: true,
    });
    expect(roomEmit).toHaveBeenCalledWith(CHAT_WEBSOCKET_EVENTS.USER_TYPING, {
      userId: 'sender',
      isTyping: true,
    });

    chatClient.send.mockReturnValue(throwError(() => new Error('chat down')));
    await expect(
      gateway.handleGetUnreadCount(client(undefined, 'user-1')),
    ).resolves.toEqual(expect.objectContaining({ count: 0 }));
    chatClient.send.mockReturnValue(of(5));
    await expect(
      gateway.handleGetUnreadCount(client(undefined, 'user-1')),
    ).resolves.toEqual(expect.objectContaining({ count: 5 }));
  });

  it('reports online state and safely handles invalid lookup input', () => {
    socketState.isOnline.mockImplementation((id) => id === 'online');
    expect(gateway.handleGetOnlineUsers(['online', 'offline'])).toEqual({
      online: true,
      offline: false,
    });
    expect(gateway.handleGetOnlineUsers(null as any)).toEqual({});
  });

  it('validates receiver IDs and maximum message length', async () => {
    const sender = client(undefined, 'sender');
    await gateway.handleMessage(sender, { content: 'hello' } as any);
    expect(sender.emit).toHaveBeenLastCalledWith('error', {
      message: 'Invalid message payload: missing receiverId',
    });

    await gateway.handleMessage(sender, {
      receiverId: 'receiver',
      content: 'x'.repeat(CHAT.MAX_MESSAGE_LENGTH + 1),
    });
    expect(sender.emit).toHaveBeenLastCalledWith('error', {
      message: `Message must be at most ${CHAT.MAX_MESSAGE_LENGTH} characters`,
    });
  });

  it('allows attachment-only messages and dispatches a notification', async () => {
    messages.sendMessage.mockResolvedValue({
      usersData: {
        sender: { id: 'sender', email: 's@example.com' },
        receiver: { id: 'receiver', email: 'r@example.com' },
      },
      savedMessage: { id: 'message-attachment' },
    });
    await expect(
      gateway.handleMessage(client(undefined, 'sender'), {
        receiverId: 'receiver',
        content: '',
        attachment: 'object-key',
        attachmentFilename: 'resume.pdf',
      } as any),
    ).resolves.toEqual(expect.objectContaining({ status: 'sent' }));
    expect(notifications.notifyChatMessage).toHaveBeenCalledWith(
      server,
      expect.objectContaining({
        hasAttachment: true,
        attachmentFilename: 'resume.pdf',
      }),
    );
  });

  it('contains message persistence failures', async () => {
    const sender = client(undefined, 'sender');
    messages.sendMessage.mockRejectedValue(new Error('blocked'));
    await expect(
      gateway.handleMessage(sender, {
        receiverId: 'receiver',
        content: 'hello',
      }),
    ).resolves.toBeUndefined();
    expect(sender.emit).toHaveBeenCalledWith('error', {
      message: 'Failed to send message',
    });
  });

  it('returns recent chats and an empty fallback', async () => {
    chatClient.send.mockReturnValueOnce(
      of([{ partnerId: 'partner-1', messages: [] }]),
    );
    const socket = client(undefined, 'user-1');
    await expect(gateway.handleGetRecentChats(socket)).resolves.toEqual([
      expect.objectContaining({ partnerId: 'partner-1' }),
    ]);
    expect(chatClient.send).toHaveBeenCalledWith(
      CHAT_SERVICE.ACTIONS.GET_RECENT_CHATS,
      'user-1',
    );

    chatClient.send.mockReturnValueOnce(throwError(() => new Error('down')));
    await expect(gateway.handleGetRecentChats(socket)).resolves.toEqual([]);
  });

  it('clamps history pagination and returns a safe failure payload', async () => {
    const socket = client(undefined, 'user-1');
    chatClient.send.mockReturnValueOnce(
      of({ messages: [], partnerId: 'partner-1' }),
    );
    await gateway.handleGetChatHistory(socket, {
      partnerId: 'partner-1',
      limit: CHAT.MAX_HISTORY_LIMIT + 100,
      offset: CHAT.MAX_HISTORY_OFFSET + 100,
    });
    expect(chatClient.send).toHaveBeenCalledWith(
      CHAT_SERVICE.ACTIONS.GET_CHAT_HISTORY,
      {
        userId1: 'user-1',
        userId2: 'partner-1',
        limit: CHAT.MAX_HISTORY_LIMIT,
        offset: CHAT.MAX_HISTORY_OFFSET,
      },
    );

    chatClient.send.mockReturnValueOnce(throwError(() => new Error('down')));
    await expect(
      gateway.handleGetChatHistory(socket, { partnerId: 'partner-1' }),
    ).resolves.toEqual(
      expect.objectContaining({
        messages: [],
        partnerId: 'partner-1',
        partnerProfile: null,
      }),
    );
  });

  it('validates and broadcasts read receipts', async () => {
    const anonymous = client();
    await gateway.handleRead(anonymous, 'message-1' as any);
    expect(anonymous.emit).toHaveBeenCalledWith('error', {
      message: 'Unauthorized',
    });

    const socket = client(undefined, 'reader');
    await gateway.handleRead(socket, {} as any);
    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'Message ID required',
    });

    chatClient.send.mockReturnValueOnce(
      of({ success: true, messageId: 'message-1' }),
    );
    await expect(
      gateway.handleRead(socket, {
        messageId: 'message-1',
        senderId: 'sender',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ success: true, messageId: 'message-1' }),
    );
    expect(roomEmit).toHaveBeenCalledWith(CHAT_WEBSOCKET_EVENTS.MESSAGE_READ, {
      messageId: 'message-1',
      readerId: 'reader',
    });

    chatClient.send.mockReturnValueOnce(throwError(() => new Error('denied')));
    await gateway.handleRead(socket, 'message-2' as any);
    expect(socket.emit).toHaveBeenLastCalledWith('error', {
      message: 'Failed to mark as read',
    });
  });

  it('validates typing payloads', async () => {
    const socket = client(undefined, 'sender');
    await gateway.handleTyping(socket, { receiverId: '', isTyping: true });
    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'Invalid typing payload',
    });
  });

  it('updates reactions and reports reaction failures', async () => {
    const socket = client(undefined, 'sender');
    chatClient.send.mockReturnValueOnce(
      of({ success: true, reactions: [{ emoji: '👍', count: 1 }] }),
    );
    await expect(
      gateway.handleReaction(socket, {
        messageId: 'message-1',
        receiverId: 'receiver',
        emoji: '👍',
      }),
    ).resolves.toEqual(expect.objectContaining({ success: true }));
    expect(roomEmit).toHaveBeenCalledWith(
      CHAT_WEBSOCKET_EVENTS.MESSAGE_REACTION,
      expect.objectContaining({ messageId: 'message-1' }),
    );

    chatClient.send.mockReturnValueOnce(
      throwError(() => new Error('invalid emoji')),
    );
    await gateway.handleReaction(socket, {
      messageId: 'message-1',
      receiverId: 'receiver',
      emoji: 'bad',
    });
    expect(socket.emit).toHaveBeenLastCalledWith('error', {
      message: 'invalid emoji',
    });
  });

  it('validates, edits, and broadcasts messages', async () => {
    const anonymous = client();
    await gateway.handleEditMessage(anonymous, {
      messageId: 'message-1',
      receiverId: 'receiver',
      newContent: 'new',
    });
    expect(anonymous.emit).toHaveBeenCalledWith('error', {
      message: 'Unauthorized',
    });

    const socket = client(undefined, 'sender');
    await gateway.handleEditMessage(socket, {
      messageId: '',
      receiverId: 'receiver',
      newContent: 'new',
    });
    expect(socket.emit).toHaveBeenLastCalledWith('error', {
      message: 'messageId is required',
    });
    await gateway.handleEditMessage(socket, {
      messageId: 'message-1',
      receiverId: 'receiver',
      newContent: '   ',
    });
    expect(socket.emit).toHaveBeenLastCalledWith('error', {
      message: `Message must be 1–${CHAT.MAX_MESSAGE_LENGTH} characters`,
    });

    chatClient.send.mockReturnValueOnce(
      of({ success: true, messageId: 'message-1', newContent: 'new' }),
    );
    await expect(
      gateway.handleEditMessage(socket, {
        messageId: 'message-1',
        receiverId: 'receiver',
        newContent: ' new ',
      }),
    ).resolves.toEqual(expect.objectContaining({ success: true }));
    expect(roomEmit).toHaveBeenCalledWith(
      CHAT_WEBSOCKET_EVENTS.MESSAGE_EDITED,
      {
        messageId: 'message-1',
        newContent: 'new',
        isEdited: true,
      },
    );

    chatClient.send.mockReturnValueOnce(
      throwError(() => new Error('not owner')),
    );
    await gateway.handleEditMessage(socket, {
      messageId: 'message-1',
      receiverId: 'receiver',
      newContent: 'again',
    });
    expect(socket.emit).toHaveBeenLastCalledWith('error', {
      message: 'not owner',
    });
  });

  it('validates, deletes, and broadcasts messages', async () => {
    const anonymous = client();
    await gateway.handleDeleteMessage(anonymous, {
      messageId: 'message-1',
      receiverId: 'receiver',
    });
    expect(anonymous.emit).toHaveBeenCalledWith('error', {
      message: 'Unauthorized',
    });

    const socket = client(undefined, 'sender');
    await gateway.handleDeleteMessage(socket, {
      messageId: '',
      receiverId: 'receiver',
    });
    expect(socket.emit).toHaveBeenLastCalledWith('error', {
      message: 'messageId is required',
    });

    chatClient.send.mockReturnValueOnce(
      of({ success: true, messageId: 'message-1' }),
    );
    await expect(
      gateway.handleDeleteMessage(socket, {
        messageId: 'message-1',
        receiverId: 'receiver',
      }),
    ).resolves.toEqual(expect.objectContaining({ success: true }));
    expect(roomEmit).toHaveBeenCalledWith(
      CHAT_WEBSOCKET_EVENTS.MESSAGE_DELETED,
      {
        messageId: 'message-1',
      },
    );

    chatClient.send.mockReturnValueOnce(
      throwError(() => new Error('not owner')),
    );
    await gateway.handleDeleteMessage(socket, {
      messageId: 'message-1',
      receiverId: 'receiver',
    });
    expect(socket.emit).toHaveBeenLastCalledWith('error', {
      message: 'not owner',
    });
  });
});
