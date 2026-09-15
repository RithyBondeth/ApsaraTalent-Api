import { RpcException } from '@nestjs/microservices';
import { ProfileAnalyticsService } from './profile-analytics.service';

describe('ProfileAnalyticsService', () => {
  const profileViews = {
    save: jest.fn(),
    create: jest.fn((data) => data),
    count: jest.fn(),
    find: jest.fn(),
  };
  const searchAppearances = {
    query: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const users = { findOne: jest.fn(), save: jest.fn() };
  const logger = { setContext: jest.fn(), warn: jest.fn(), error: jest.fn() };

  const service = new ProfileAnalyticsService(
    profileViews as any,
    searchAppearances as any,
    users as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    profileViews.save.mockResolvedValue({ id: 'v1' });
  });

  async function expectRpc(
    promise: Promise<unknown>,
    statusCode: number,
    message: string,
  ) {
    const error = (await promise.catch((caught) => caught)) as RpcException;
    expect(error).toBeInstanceOf(RpcException);
    expect(error.getError()).toEqual({ statusCode, message });
  }

  describe('recordProfileView', () => {
    it('skips self-views', async () => {
      // Opening your own profile is not a signal about interest from others.
      await service.recordProfileView('user-1', 'user-1');
      expect(profileViews.save).not.toHaveBeenCalled();
    });

    it('skips when the target id is missing', async () => {
      await service.recordProfileView('user-1', '');
      expect(profileViews.save).not.toHaveBeenCalled();
    });

    it('records a signed-out view without loading a viewer', async () => {
      await service.recordProfileView(null, 'user-2');
      expect(users.findOne).not.toHaveBeenCalled();
      expect(profileViews.save).toHaveBeenCalledWith(
        expect.objectContaining({
          viewer: null,
          viewed: { id: 'user-2' },
          viewerHidden: false,
        }),
      );
    });

    it('stamps viewerHidden when the viewer has browsePrivately on', async () => {
      // The row still lands — the profile owner's count still moves. It just
      // has to know not to name this viewer on the recent-viewers list.
      users.findOne.mockResolvedValueOnce({
        id: 'user-1',
        browsePrivately: true,
      });
      await service.recordProfileView('user-1', 'user-2');
      expect(profileViews.save).toHaveBeenCalledWith(
        expect.objectContaining({ viewerHidden: true }),
      );
    });

    it('swallows write errors — analytics is fire-and-forget', async () => {
      // The profile page must not 500 because the analytics table is down.
      users.findOne.mockResolvedValueOnce({
        id: 'user-1',
        browsePrivately: false,
      });
      profileViews.save.mockRejectedValueOnce(new Error('db down'));
      await expect(
        service.recordProfileView('user-1', 'user-2'),
      ).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('recordSearchAppearances', () => {
    it('is a no-op on an empty id list', async () => {
      await service.recordSearchAppearances([]);
      expect(searchAppearances.query).not.toHaveBeenCalled();
    });

    it('dedupes ids before hitting the database', async () => {
      // Same user twice on the same page should still be one bump today —
      // duplicates in the input are noise, not signal.
      await service.recordSearchAppearances(['u1', 'u1', 'u2']);
      expect(searchAppearances.query).toHaveBeenCalledTimes(1);
      const args = searchAppearances.query.mock.calls[0];
      expect(args[1]).toEqual(['u1', 'u2', expect.any(String)]);
    });

    it('swallows write errors — search results must land regardless', async () => {
      searchAppearances.query.mockRejectedValueOnce(new Error('down'));
      await expect(
        service.recordSearchAppearances(['u1']),
      ).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('getMyProfileAnalytics', () => {
    beforeEach(() => {
      searchAppearances.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '42' }),
      });
    });

    it('404s an unknown user', async () => {
      users.findOne.mockResolvedValueOnce(null);
      await expectRpc(
        service.getMyProfileAnalytics('user-x'),
        404,
        'User not found',
      );
    });

    it('returns the shape the profile page renders', async () => {
      users.findOne.mockResolvedValueOnce({
        id: 'user-1',
        browsePrivately: false,
      });
      profileViews.count
        .mockResolvedValueOnce(3) // 7d window
        .mockResolvedValueOnce(11); // 30d window
      profileViews.find.mockResolvedValueOnce([]);

      const result = await service.getMyProfileAnalytics('user-1');

      expect(result.profileViews7d).toBe(3);
      expect(result.profileViews30d).toBe(11);
      // Sum comes from the raw query, coerced to number.
      expect(result.searchAppearances30d).toBe(42);
      expect(result.browsePrivately).toBe(false);
      expect(result.recentViewers).toEqual([]);
    });

    it('anonymizes hidden and signed-out rows on the recent-viewers list', async () => {
      users.findOne.mockResolvedValueOnce({
        id: 'user-1',
        browsePrivately: false,
      });
      profileViews.count.mockResolvedValue(0);
      profileViews.find.mockResolvedValueOnce([
        {
          id: 'v1',
          viewedAt: new Date('2026-09-06'),
          viewerHidden: true,
          viewer: {
            id: 'u2',
            role: 'employee',
            employee: {
              firstname: 'Alice',
              lastname: 'Wong',
              avatar: 'a.png',
            },
          },
        },
        {
          id: 'v2',
          viewedAt: new Date('2026-09-05'),
          viewerHidden: false,
          viewer: null,
        },
      ]);

      const result = await service.getMyProfileAnalytics('user-1');
      expect(result.recentViewers).toHaveLength(2);
      // Row 1: viewer was signed in but private — identity fields are
      // stripped, timestamp is kept.
      expect(result.recentViewers[0].viewerId).toBeNull();
      expect(result.recentViewers[0].viewerName).toBeNull();
      expect(result.recentViewers[0].viewedAt).toEqual(new Date('2026-09-06'));
      // Row 2: signed-out visitor — same shape.
      expect(result.recentViewers[1].viewerId).toBeNull();
    });
  });

  describe('updatePrivacySettings', () => {
    it('flips the column and returns the new value', async () => {
      const user = { id: 'user-1', browsePrivately: false };
      users.findOne.mockResolvedValueOnce(user);
      users.save.mockResolvedValueOnce(user);

      const result = await service.updatePrivacySettings('user-1', {
        browsePrivately: true,
      });

      expect(user.browsePrivately).toBe(true);
      expect(result.browsePrivately).toBe(true);
    });

    it('404s an unknown user', async () => {
      users.findOne.mockResolvedValueOnce(null);
      await expectRpc(
        service.updatePrivacySettings('u-x', { browsePrivately: true }),
        404,
        'User not found',
      );
    });
  });
});
