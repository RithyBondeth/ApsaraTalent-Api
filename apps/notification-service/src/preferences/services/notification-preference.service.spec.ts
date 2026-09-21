import { ENotificationCategory } from '@app/common/database/enums/notification-category.enum';
import { ENotificationChannel } from '@app/common/database/enums/notification-channel.enum';
import { RpcException } from '@nestjs/microservices';
import { NotificationPreferenceService } from './notification-preference.service';

describe('NotificationPreferenceService', () => {
  const repo = {
    findOne: jest.fn(),
    create: jest.fn((values: any) => values),
    save: jest.fn((row: any) => row) as jest.Mock,
  };
  const logger = { setContext: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const analytics = { capture: jest.fn(), identify: jest.fn() };
  const service = new NotificationPreferenceService(
    repo as any,
    analytics as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findOne.mockResolvedValue(null);
    repo.save.mockImplementation((row: any) => row);
  });

  describe('resolve', () => {
    it('returns the defaults for a user who has never chosen', async () => {
      const preferences = await service.resolve({ userId: 'u1' });

      expect(preferences.emailEnabled).toBe(true);
      expect(preferences.pushEnabled).toBe(true);
      expect(preferences.categories[ENotificationCategory.APPLICATION]).toEqual(
        { email: true, push: true },
      );
      // Chat already pushes in real time; emailing every message would be the
      // loudest thing the platform does.
      expect(preferences.categories[ENotificationCategory.MESSAGE].email).toBe(
        false,
      );
    });

    it('merges a partial stored choice over the defaults', async () => {
      repo.findOne.mockResolvedValue({
        emailEnabled: true,
        pushEnabled: false,
        categories: { match: { email: false } },
      });

      const preferences = await service.resolve({ userId: 'u1' });

      expect(preferences.pushEnabled).toBe(false);
      expect(preferences.categories[ENotificationCategory.MATCH]).toEqual({
        email: false,
        // Untouched by the stored partial, so it still comes from the defaults.
        push: true,
      });
      expect(preferences.categories[ENotificationCategory.INTERVIEW]).toEqual({
        email: true,
        push: true,
      });
    });
  });

  describe('canDeliver', () => {
    it('never suppresses account mail, even with the master switch off', async () => {
      repo.findOne.mockResolvedValue({
        emailEnabled: false,
        pushEnabled: false,
        categories: {},
      });

      await expect(
        service.canDeliver({
          userId: 'u1',
          category: ENotificationCategory.ACCOUNT,
          channel: ENotificationChannel.EMAIL,
        }),
      ).resolves.toBe(true);
      // Answered without a lookup at all — the row cannot change the outcome.
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('honours the master switch over an enabled category', async () => {
      repo.findOne.mockResolvedValue({
        emailEnabled: false,
        pushEnabled: true,
        categories: { application: { email: true } },
      });

      await expect(
        service.canDeliver({
          userId: 'u1',
          category: ENotificationCategory.APPLICATION,
          channel: ENotificationChannel.EMAIL,
        }),
      ).resolves.toBe(false);
    });

    it('honours a category opt-out while the master switch is on', async () => {
      repo.findOne.mockResolvedValue({
        emailEnabled: true,
        pushEnabled: true,
        categories: { match: { push: false } },
      });

      await expect(
        service.canDeliver({
          userId: 'u1',
          category: ENotificationCategory.MATCH,
          channel: ENotificationChannel.PUSH,
        }),
      ).resolves.toBe(false);
    });

    it('fails open when preferences cannot be read', async () => {
      repo.findOne.mockRejectedValue(new Error('database unavailable'));

      // Over-delivery is recoverable; silently dropping "you were hired" is not.
      await expect(
        service.canDeliver({
          userId: 'u1',
          category: ENotificationCategory.APPLICATION,
          channel: ENotificationChannel.EMAIL,
        }),
      ).resolves.toBe(true);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('creates the row on first write with an unsubscribe token', async () => {
      await service.update({ userId: 'u1', emailEnabled: false });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          unsubscribeToken: expect.stringMatching(/^[0-9a-f]{48}$/),
        }),
      );
    });

    it('merges categories rather than replacing the map', async () => {
      repo.findOne.mockResolvedValue({
        id: 'p1',
        emailEnabled: true,
        pushEnabled: true,
        categories: { match: { email: false }, interview: { push: false } },
      });

      await service.update({
        userId: 'u1',
        categories: { match: { push: false } },
      });

      const [saved] = repo.save.mock.calls[0] as [any];
      // A second tab's earlier choice on another category survives.
      expect(saved.categories).toEqual({
        match: { email: false, push: false },
        interview: { push: false },
      });
    });

    it('drops keys that are not real categories or channels', async () => {
      repo.findOne.mockResolvedValue({
        id: 'p1',
        emailEnabled: true,
        pushEnabled: true,
        categories: {},
      });

      await service.update({
        userId: 'u1',
        categories: {
          nonsense: { email: false },
          match: { email: false, telepathy: true },
        } as never,
      });

      const [saved] = repo.save.mock.calls[0] as [any];
      expect(saved.categories).toEqual({ match: { email: false } });
    });

    it('reports a write failure as an RPC exception', async () => {
      repo.save.mockRejectedValue(new Error('database unavailable'));

      await expect(
        service.update({ userId: 'u1', emailEnabled: false }),
      ).rejects.toBeInstanceOf(RpcException);
    });
  });

  describe('unsubscribe', () => {
    it('turns email off for a known token', async () => {
      const row = { id: 'p1', emailEnabled: true };
      repo.findOne.mockResolvedValue(row);

      await service.unsubscribe({ token: 'a'.repeat(48) });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ emailEnabled: false }),
      );
    });

    it('acknowledges an unknown token without revealing that it is unknown', async () => {
      repo.findOne.mockResolvedValue(null);

      // Reporting "no such token" would make the endpoint an oracle for which
      // tokens are real.
      await expect(
        service.unsubscribe({ token: 'b'.repeat(48) }),
      ).resolves.toEqual({
        message: 'You have been unsubscribed from notification emails.',
      });
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
