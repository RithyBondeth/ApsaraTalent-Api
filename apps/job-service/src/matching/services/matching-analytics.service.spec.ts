import 'reflect-metadata';
import { MatchingAnalyticsService } from './matching-analytics.service';
import { createMatchingFixtures, expectRpc } from './matching-test-fixtures';

describe('MatchingAnalyticsService', () => {
  const {
    matching,
    employeeFavorites,
    companyFavorites,
    email,
    logger,
    redis,
    company,
  } = createMatchingFixtures();

  const service = new MatchingAnalyticsService(
    matching as any,
    employeeFavorites as any,
    companyFavorites as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    matching.save.mockImplementation(async (value) => ({
      id: 'match-1',
      ...value,
    }));
    email.sendEmail.mockResolvedValue(undefined);
  });

  it('builds real-time analytics for an employee', async () => {
    matching.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(4);
    employeeFavorites.count.mockResolvedValueOnce(3);

    function activityBuilder(rows: any[]) {
      const qb: any = {};
      for (const method of [
        'select',
        'where',
        'andWhere',
        'groupBy',
        'orderBy',
      ]) {
        qb[method] = jest.fn(() => qb);
      }
      qb.getRawMany = jest.fn().mockResolvedValue(rows);
      return qb;
    }
    const today = new Date();
    const day = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
    const month = day.slice(0, 7);
    matching.createQueryBuilder
      .mockReturnValueOnce(
        activityBuilder([{ day, likes: '2', received: '1', matches: '1' }]),
      )
      .mockReturnValueOnce(
        activityBuilder([{ month, likes: '5', received: '3', matches: '2' }]),
      );
    matching.find.mockResolvedValueOnce([
      { id: 'match-1', company, createdAt: new Date('2026-01-01') },
    ]);

    const result = await service.getMatchingAnalytics({
      role: 'employee',
      userId: 'employee-1',
    });
    expect(result).toEqual(
      expect.objectContaining({
        totalLikesGiven: 10,
        totalLikesReceived: 8,
        totalMatches: 4,
        totalFavorites: 3,
        matchRate: 40,
      }),
    );
    expect(result.weeklyActivity).toHaveLength(7);
    expect(result.monthlyActivity).toHaveLength(12);
    expect(result.recentMatches[0]).toEqual(
      expect.objectContaining({ name: 'Apsara' }),
    );
  });

  it('builds zero-filled company analytics and unknown recent identities', async () => {
    matching.count.mockResolvedValue(0);
    companyFavorites.count.mockResolvedValue(0);
    const activityBuilder = () => {
      const qb: any = {};
      for (const method of [
        'select',
        'where',
        'andWhere',
        'groupBy',
        'orderBy',
      ]) {
        qb[method] = jest.fn(() => qb);
      }
      qb.getRawMany = jest.fn().mockResolvedValue([]);
      return qb;
    };
    matching.createQueryBuilder
      .mockReturnValueOnce(activityBuilder())
      .mockReturnValueOnce(activityBuilder());
    matching.find.mockResolvedValueOnce([
      { id: 'match-1', employee: null, createdAt: new Date('2026-01-01') },
    ]);

    const result = await service.getMatchingAnalytics({
      role: 'company',
      userId: 'company-1',
    });
    expect(result.matchRate).toBe(0);
    expect(result.weeklyActivity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ likes: 0, received: 0, matches: 0 }),
      ]),
    );
    expect(result.recentMatches[0]).toEqual(
      expect.objectContaining({ name: 'Unknown', avatar: null }),
    );
  });

  it('wraps analytics database failures', async () => {
    matching.count.mockRejectedValueOnce(new Error('analytics failed'));
    await expectRpc(
      service.getMatchingAnalytics({ role: 'employee', userId: 'employee-1' }),
      500,
      'analytics failed',
    );
  });

  it('formats recent company-side matches with employee fallbacks', async () => {
    matching.find.mockResolvedValue([
      {
        id: 'match-1',
        employee: { firstname: 'Sok', avatar: null },
        createdAt: new Date('2026-01-01'),
      },
    ]);
    await expect(
      (service as any).getRecentMatches('company-1', 'company', false),
    ).resolves.toEqual([
      expect.objectContaining({ name: 'Sok', avatar: null }),
    ]);
  });
});
