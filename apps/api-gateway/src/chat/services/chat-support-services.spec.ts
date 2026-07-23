import 'reflect-metadata';
import { CHAT_WEBSOCKET_EVENTS } from '@app/contracts';
import { of, throwError } from 'rxjs';
import { ChatMessageService } from './chat-message.service';
import { ChatNotificationService } from './chat-notification.service';
import { ChatRateLimiterService } from './chat-rate-limiter.service';
import { SocketStateService } from './socket-state.service';

describe('chat support services', () => {
  describe('ChatRateLimiterService', () => {
    it('allows ten messages and blocks the eleventh within the window', () => {
      const service = new ChatRateLimiterService();
      for (let i = 0; i < 10; i += 1) {
        expect(service.isRateLimited('user-1')).toBe(false);
      }
      expect(service.isRateLimited('user-1')).toBe(true);
      expect(service.isRateLimited('user-2')).toBe(false);
    });

    it('expires old timestamps and allows sending again', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_000);
      const service = new ChatRateLimiterService();
      for (let i = 0; i < 10; i += 1) service.isRateLimited('user-1');
      jest.spyOn(Date, 'now').mockReturnValue(7_000);
      expect(service.isRateLimited('user-1')).toBe(false);
    });
  });

  describe('SocketStateService', () => {
    it('tracks multiple sockets without marking a partially disconnected user offline', () => {
      const service = new SocketStateService();
      expect(service.addSocket('user-1', 'socket-1')).toBe(true);
      expect(service.addSocket('user-1', 'socket-2')).toBe(false);
      expect(service.isOnline('user-1')).toBe(true);
      expect(service.removeSocket('user-1', 'socket-1')).toBe(false);
      expect(service.isOnline('user-1')).toBe(true);
      expect(service.removeSocket('user-1', 'socket-2')).toBe(true);
      expect(service.isOnline('user-1')).toBe(false);
    });

    it('safely ignores a socket removal for an unknown user', () => {
      const service = new SocketStateService();
      expect(service.removeSocket('missing', 'socket')).toBe(false);
    });
  });

  describe('ChatMessageService', () => {
    const client = { send: jest.fn() };
    const service = new ChatMessageService(client as any);

    beforeEach(() => jest.clearAllMocks());

    it('validates participants before creating a normalized message', async () => {
      client.send
        .mockReturnValueOnce(
          of({
            sender: { id: 'sender-user' },
            receiver: { id: 'receiver-user' },
          }),
        )
        .mockReturnValueOnce(of({ id: 'message-1' }));

      const result = await service.sendMessage('sender-profile', {
        receiverId: 'receiver-profile',
        content: '  Hello  ',
        replyToId: 'message-0',
      });

      expect(client.send).toHaveBeenNthCalledWith(1, expect.anything(), {
        senderId: 'sender-profile',
        receiverId: 'receiver-profile',
      });
      expect(client.send).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({
          senderId: 'sender-user',
          receiverId: 'receiver-user',
          content: 'Hello',
          type: 'text',
          replyToId: 'message-0',
        }),
      );
      expect(result.trimmedContent).toBe('Hello');
      expect(result.hasAttachment).toBe(false);
    });

    it('does not create a message if participant validation fails', async () => {
      client.send.mockReturnValueOnce(throwError(() => new Error('blocked')));
      await expect(
        service.sendMessage('sender', {
          receiverId: 'receiver',
          content: 'Hi',
        }),
      ).rejects.toThrow('blocked');
      expect(client.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('ChatNotificationService', () => {
    const chat = { send: jest.fn() };
    const notifications = { send: jest.fn() };
    const users = { send: jest.fn() };
    const sockets = { isOnline: jest.fn() };
    const service = new ChatNotificationService(
      chat as any,
      notifications as any,
      users as any,
      sockets as any,
    );
    const emit = jest.fn();
    const server = { to: jest.fn(() => ({ emit })) } as any;

    beforeEach(() => jest.clearAllMocks());

    it('resolves employee and company caller identities with safe fallbacks', async () => {
      users.send.mockReturnValueOnce(
        of({
          employee: { firstname: 'Sok', lastname: 'Dara', avatar: 'a.png' },
        }),
      );
      await expect(service.getCallerProfile('user-1')).resolves.toEqual({
        name: 'Sok Dara',
        avatar: 'a.png',
      });

      users.send.mockReturnValueOnce(of({ company: { name: 'Apsara' } }));
      await expect(service.getCallerProfile('user-2')).resolves.toEqual(
        expect.objectContaining({ name: 'Apsara' }),
      );

      users.send.mockReturnValueOnce(throwError(() => new Error('down')));
      await expect(service.getCallerProfile('user-3')).resolves.toEqual(
        expect.objectContaining({ name: 'Unknown' }),
      );
    });

    it('covers missing, email, username, and default profile fallbacks', async () => {
      users.send
        .mockReturnValueOnce(of(null))
        .mockReturnValueOnce(of({ employee: { username: 'Alias' } }))
        .mockReturnValueOnce(of({ employee: {}, email: 'person@example.com' }))
        .mockReturnValueOnce(of({}));
      await expect(service.getCallerProfile('missing')).resolves.toEqual(
        expect.objectContaining({ name: 'Unknown' }),
      );
      await expect(service.getCallerProfile('alias')).resolves.toEqual(
        expect.objectContaining({ name: 'Alias' }),
      );
      await expect(service.getCallerProfile('email')).resolves.toEqual(
        expect.objectContaining({ name: 'person@example.com' }),
      );
      await expect(service.getCallerProfile('unknown')).resolves.toEqual(
        expect.objectContaining({ name: 'Unknown' }),
      );
    });

    it('creates an in-app notification and suppresses push for online receivers', async () => {
      users.send.mockReturnValue(of({ employee: { username: 'Sender' } }));
      sockets.isOnline.mockReturnValue(true);
      notifications.send.mockReturnValue(of({ id: 'notification-1' }));

      await service.notifyChatMessage(server, {
        senderId: 'sender',
        receiverId: 'receiver',
        messageType: 'text',
        content: 'Hello',
        hasAttachment: false,
        messageId: 'message-1',
      });

      expect(notifications.send).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'receiver', sendPush: false }),
      );
      expect(server.to).toHaveBeenCalledWith('receiver');
      expect(emit).toHaveBeenCalledWith(
        CHAT_WEBSOCKET_EVENTS.NEW_NOTIFICATION,
        { id: 'notification-1' },
      );
    });

    it('contains notification-service failures so message delivery continues', async () => {
      users.send.mockReturnValue(of(null));
      sockets.isOnline.mockReturnValue(false);
      notifications.send.mockReturnValue(
        throwError(() => new Error('notification down')),
      );
      await expect(
        service.notifyChatMessage(server, {
          senderId: 'sender',
          receiverId: 'receiver',
          messageType: 'text',
          content: 'Hello',
          hasAttachment: false,
          messageId: 'message-1',
        }),
      ).resolves.toBeUndefined();
    });

    it('does not emit a websocket event when persistence returns no id', async () => {
      users.send.mockReturnValue(of({ company: { name: 'Sender' } }));
      sockets.isOnline.mockReturnValue(false);
      notifications.send.mockReturnValue(of({}));
      await service.notifyChatMessage(server, {
        senderId: 'sender',
        receiverId: 'receiver',
        messageType: 'document',
        content: '',
        hasAttachment: true,
        attachmentFilename: 'resume.pdf',
        messageId: 'message-1',
      });
      expect(emit).not.toHaveBeenCalled();
    });

    it.each([
      ['missed', 'Missed call'],
      ['declined', 'Call declined'],
      ['error', 'Call failed'],
      ['ended', 'Call ended'],
    ])('maps call reason %s to a stable chat label', (reason, expected) => {
      expect(service.resolveCallEndContent(reason)).toBe(expected);
    });

    it('emits call logs to both participants with the correct perspective', async () => {
      chat.send.mockReturnValue(of({ id: 'message-1', type: 'call' }));
      await service.emitCallLogMessage(server, {
        senderId: 'sender',
        receiverId: 'receiver',
        content: 'Call ended',
      });
      expect(server.to).toHaveBeenCalledWith('receiver');
      expect(server.to).toHaveBeenCalledWith('sender');
      expect(emit).toHaveBeenCalledWith(
        CHAT_WEBSOCKET_EVENTS.NEW_MESSAGE,
        expect.objectContaining({ isMe: false }),
      );
      expect(emit).toHaveBeenCalledWith(
        CHAT_WEBSOCKET_EVENTS.NEW_MESSAGE,
        expect.objectContaining({ isMe: true }),
      );
    });

    it('contains malformed call-log failures', async () => {
      chat.send.mockReturnValue(throwError(() => 'offline'));
      await expect(
        service.emitCallLogMessage(server, {
          senderId: 'sender',
          receiverId: 'receiver',
          content: 'Call failed',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
