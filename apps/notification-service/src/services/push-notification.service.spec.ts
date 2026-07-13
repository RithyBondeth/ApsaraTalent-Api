import { PushNotificationService } from './push-notification.service';

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
});
