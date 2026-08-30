import { PushNotificationService } from './push-notification.service';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

jest.mock('firebase-admin/app', () => ({
  cert: jest.fn((value) => value),
  initializeApp: jest.fn(() => ({ name: 'firebase-app' })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: 'existing-app' })),
}));
jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn(),
}));

describe('PushNotificationService external boundary', () => {
  const logger = {
    setContext: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('fails safely without contacting Firebase when configuration is absent', async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const service = new PushNotificationService(config as any, logger as any);

    expect(service.isConfigured()).toBe(false);
    await expect(
      service.sendToToken('device-token', {
        title: 'Hello',
        body: 'Private notification',
      }),
    ).resolves.toEqual({
      success: false,
      skipped: true,
      reason: 'firebase not configured',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Push notifications are disabled'),
    );
  });

  it('rejects an empty device token before attempting delivery', async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const service = new PushNotificationService(config as any, logger as any);

    await expect(
      service.sendToToken('', { title: 'Hello', body: 'Message' }),
    ).resolves.toEqual({
      success: false,
      skipped: true,
      reason: 'missing token',
    });
  });

  it.each([
    JSON.stringify({
      project_id: 'project-1',
      client_email: 'firebase@example.com',
    }),
    Buffer.from(
      JSON.stringify({
        projectId: 'project-2',
        clientEmail: 'firebase2@example.com',
      }),
    ).toString('base64'),
  ])('initializes Firebase from JSON or base64 credentials', (raw) => {
    const config = { get: jest.fn().mockReturnValue(raw) };
    const service = new PushNotificationService(config as any, logger as any);
    expect(service.isConfigured()).toBe(true);
    expect(cert).toHaveBeenCalled();
    expect(initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: expect.stringMatching(/^project-/),
      }),
    );
  });

  it('rejects invalid credential encodings without crashing startup', () => {
    const config = { get: jest.fn().mockReturnValue('not-json-or-base64') };
    const service = new PushNotificationService(config as any, logger as any);
    expect(service.isConfigured()).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid FIREBASE'),
    );
  });

  it('reuses an existing Firebase app when initialization reports a duplicate', () => {
    (initializeApp as jest.Mock).mockImplementationOnce(() => {
      throw new Error('already exists');
    });
    (getApps as jest.Mock).mockReturnValueOnce([{ name: 'existing-app' }]);
    const config = {
      get: jest
        .fn()
        .mockReturnValue(JSON.stringify({ project_id: 'project-1' })),
    };
    const service = new PushNotificationService(config as any, logger as any);
    expect(getApp).toHaveBeenCalled();
    expect(service.isConfigured()).toBe(true);
  });

  it('normalizes data and sends a complete web-push message', async () => {
    const send = jest.fn().mockResolvedValue('message-id');
    (getMessaging as jest.Mock).mockReturnValue({ send });
    const config = {
      get: jest.fn().mockReturnValue(
        JSON.stringify({
          project_id: 'project-1',
          client_email: 'firebase@example.com',
        }),
      ),
    };
    const service = new PushNotificationService(config as any, logger as any);
    await expect(
      service.sendToToken('device-token', {
        title: 'New message',
        body: 'Hello',
        senderAvatar: 'avatar.png',
        data: {
          senderId: 'sender-1',
          url: '/chat/sender-1',
          count: 2,
          ignored: null,
        },
      }),
    ).resolves.toEqual({ success: true, response: 'message-id' });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'device-token',
        data: expect.objectContaining({ count: '2' }),
        webpush: expect.objectContaining({
          fcmOptions: { link: '/chat/sender-1' },
          notification: expect.objectContaining({ tag: 'chat-sender-1' }),
        }),
      }),
    );
  });

  it('tags non-chat pushes by type so they cannot stack', async () => {
    const send = jest.fn().mockResolvedValue('message-id');
    (getMessaging as jest.Mock).mockReturnValue({ send });
    const config = {
      get: jest.fn().mockReturnValue(
        JSON.stringify({
          project_id: 'project-1',
          client_email: 'firebase@example.com',
        }),
      ),
    };
    const service = new PushNotificationService(config as any, logger as any);

    await service.sendToToken('device-token', {
      title: "It's a Match!",
      body: 'You liked each other',
      // Match, like and interview payloads carry no senderId — only chat does.
      data: { type: 'match', targetUserId: 'user-1', url: '/matching' },
    });

    /*
      Without a tag these stacked, and the browser had nothing to deduplicate
      against when the SDK auto-displays the payload and onBackgroundMessage
      re-shows it.
    */
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        webpush: expect.objectContaining({
          notification: expect.objectContaining({ tag: 'type-match' }),
        }),
      }),
    );
  });

  it('returns a stable failure response when Firebase delivery fails', async () => {
    (getMessaging as jest.Mock).mockReturnValue({
      send: jest.fn().mockRejectedValue(new Error('invalid device token')),
    });
    const config = {
      get: jest
        .fn()
        .mockReturnValue(JSON.stringify({ project_id: 'project-1' })),
    };
    const service = new PushNotificationService(config as any, logger as any);
    await expect(
      service.sendToToken('device-token', { title: 'Hello', body: 'Message' }),
    ).resolves.toEqual({ success: false, error: 'invalid device token' });
  });
});
