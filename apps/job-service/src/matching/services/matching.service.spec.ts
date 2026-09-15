import 'reflect-metadata';
import { MatchingService } from './matching.service';
import { MatchingQueryService } from './matching-query.service';
import { MatchLinkService } from './match-link.service';
import { computeSkillScore } from '../utils/matching-score.util';
import { createMatchingFixtures, expectRpc } from '../matching-test-fixtures';

describe('MatchingService', () => {
  const {
    matching,
    employees,
    companies,
    employeeFavorites,
    companyFavorites,
    interviews,
    logger,
    redis,
    notifications,
    employee,
    company,
  } = createMatchingFixtures();

  /*
    A real collaborator over the same fixtures rather than a mock: the upsert
    these tests assert on moved into it wholesale, so the existing expectations
    on `employees.findOne` / `companies.findOne` / `matching.save` still
    describe the behaviour under test.
  */
  const matchLink = new MatchLinkService(
    matching as any,
    employees as any,
    companies as any,
    redis as any,
  );

  const analytics = { capture: jest.fn(), identify: jest.fn() };
  const service = new MatchingService(
    matching as any,
    employeeFavorites as any,
    companyFavorites as any,
    interviews as any,
    analytics as any,
    logger as any,
    redis as any,
    notifications as any,
    matchLink,
  );

  // Read-side methods moved to MatchingQueryService; it shares the same
  // repository, logger and cache fixtures, so behaviour under test is unchanged.
  const queryService = new MatchingQueryService(
    matching as any,
    logger as any,
    redis as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    matching.save.mockImplementation(async (value) => ({
      id: 'match-1',
      ...value,
    }));
  });

  it('rejects a like when either profile is missing', async () => {
    employees.findOne.mockResolvedValue(null);
    companies.findOne.mockResolvedValue(company);
    await expectRpc(
      service.employeeLikes({ eid: 'employee-1', cid: 'company-1' }),
      404,
      'Employee or Company not found.',
    );
  });

  it('creates an employee like with a deterministic skill score', async () => {
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    matching.findOne.mockResolvedValue(null);

    const result = await service.employeeLikes({
      eid: 'employee-1',
      cid: 'company-1',
    });

    expect(matching.create).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeLiked: true,
        companyLiked: false,
        isMatched: false,
        skillScore: 50,
      }),
    );
    expect(employeeFavorites.delete).toHaveBeenCalled();
    expect(redis.invalidateMatchingCaches).toHaveBeenCalledWith(
      'employee-1',
      'company-1',
    );
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'company-user', type: 'like' }),
    );
    expect(result.notificationTargets).toEqual(['company-user']);
  });

  it('turns a reciprocal employee like into a match and notifies both sides', async () => {
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    const existing = {
      employee,
      company,
      employeeLiked: false,
      companyLiked: true,
      isMatched: false,
    };
    matching.findOne.mockResolvedValue(existing);

    const result = await service.employeeLikes({
      eid: 'employee-1',
      cid: 'company-1',
    });

    expect(existing.isMatched).toBe(true);
    // The match email is notification-service's job now — reached through the
    // emits asserted above, so there is nothing to assert here.
    expect(notifications.emit).toHaveBeenCalledTimes(2);
    expect(result.notificationTargets).toEqual([
      'company-user',
      'employee-user',
    ]);
  });

  it('turns a reciprocal company like into a match', async () => {
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    const existing = {
      employee,
      company,
      employeeLiked: true,
      companyLiked: false,
      isMatched: false,
    };
    matching.findOne.mockResolvedValue(existing);

    const result = await service.companyLikes({
      eid: 'employee-1',
      cid: 'company-1',
    });

    expect(existing.isMatched).toBe(true);
    expect(companyFavorites.delete).toHaveBeenCalled();
    expect(result.notificationTargets).toEqual([
      'employee-user',
      'company-user',
    ]);
  });

  it('does not produce a numeric score without skills or open positions', async () => {
    employees.findOne.mockResolvedValue({ ...employee, skills: [] });
    companies.findOne.mockResolvedValue(company);
    matching.findOne.mockResolvedValue(null);

    await service.companyLikes({ eid: 'employee-1', cid: 'company-1' });
    expect(matching.create).toHaveBeenCalledWith(
      expect.objectContaining({ skillScore: null }),
    );
  });

  it('rejects unmatching a missing relationship', async () => {
    matching.findOne.mockResolvedValue(null);
    await expectRpc(
      service.unmatch({ eid: 'employee-1', cid: 'company-1' }),
      404,
      'Match not found.',
    );
  });

  it('deletes the match and its interviews atomically from the workflow', async () => {
    matching.findOne.mockResolvedValue({ id: 'match-1' });

    await expect(
      service.unmatch({ eid: 'employee-1', cid: 'company-1' }),
    ).resolves.toEqual(expect.objectContaining({ success: true }));
    expect(matching.delete).toHaveBeenCalledWith({ id: 'match-1' });
    expect(interviews.delete).toHaveBeenCalledWith({
      employee: { id: 'employee-1' },
      company: { id: 'company-1' },
    });
    expect(redis.invalidateMatchingCaches).toHaveBeenCalled();
  });

  it('returns both auth user IDs so the gateway can broadcast the unmatch', async () => {
    matching.findOne.mockResolvedValue({
      id: 'match-1',
      employee: { id: 'employee-1', user: { id: 'employee-user' } },
      company: { id: 'company-1', user: { id: 'company-user' } },
    });

    await expect(
      service.unmatch({ eid: 'employee-1', cid: 'company-1' }),
    ).resolves.toEqual(
      expect.objectContaining({
        notifyUserIds: ['employee-user', 'company-user'],
      }),
    );
    expect(matching.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: ['employee', 'employee.user', 'company', 'company.user'],
      }),
    );
  });

  it('omits missing auth user IDs from the unmatch broadcast list', async () => {
    matching.findOne.mockResolvedValue({
      id: 'match-1',
      employee: { id: 'employee-1', user: { id: 'employee-user' } },
      company: { id: 'company-1' },
    });

    await expect(
      service.unmatch({ eid: 'employee-1', cid: 'company-1' }),
    ).resolves.toEqual(
      expect.objectContaining({ notifyUserIds: ['employee-user'] }),
    );
  });

  it('stamps only the unseen rows on the acting side and returns fresh counts', async () => {
    matching.update.mockResolvedValue({ affected: 2 });
    // Total 5, none left unseen once the update lands.
    matching.count.mockResolvedValueOnce(5).mockResolvedValueOnce(0);

    await expect(
      service.markEmployeeMatchingSeen({ eid: 'employee-1' }),
    ).resolves.toEqual({ count: 5, unseenCount: 0 });

    /*
      Only rows still null are written, so re-opening the page does not churn
      timestamps, and the company's own seen column is never touched.
    */
    const [where, patch] = matching.update.mock.calls[0];
    expect(where).toMatchObject({
      employee: { id: 'employee-1' },
      isMatched: true,
    });
    expect(Object.keys(patch)).toEqual(['employeeSeenAt']);
    expect(patch.employeeSeenAt).toBeInstanceOf(Date);
    // The cached count must drop, or the badge would serve a stale number.
    expect(redis.del).toHaveBeenCalledWith(
      'apsaratalent:job-service:matching:employee-matching-count-v2:employee-1',
    );
  });

  it('stamps the company column when the company is the one looking', async () => {
    matching.update.mockResolvedValue({ affected: 1 });
    matching.count.mockResolvedValueOnce(3).mockResolvedValueOnce(0);

    await expect(
      service.markCompanyMatchingSeen({ cid: 'company-1' }),
    ).resolves.toEqual({ count: 3, unseenCount: 0 });

    const [where, patch] = matching.update.mock.calls[0];
    expect(where).toMatchObject({ company: { id: 'company-1' } });
    expect(Object.keys(patch)).toEqual(['companySeenAt']);
    expect(redis.del).toHaveBeenCalledWith(
      'apsaratalent:job-service:matching:company-matching-count-v2:company-1',
    );
  });

  it('wraps a failure to mark matches as seen', async () => {
    matching.update.mockRejectedValue(new Error('update failed'));
    await expectRpc(
      service.markEmployeeMatchingSeen({ eid: 'employee-1' }),
      500,
      'update failed',
    );
  });

  it('reports how many matches each side has not opened yet', async () => {
    redis.get.mockResolvedValue(null);
    matching.count.mockResolvedValueOnce(7).mockResolvedValueOnce(3);

    await expect(
      queryService.findCurrentEmployeeMatchingCount({ eid: 'employee-1' }),
    ).resolves.toEqual({ count: 7, unseenCount: 3 });

    // The badge number is the unseen one, resolved here rather than by
    // subtracting a client-held high-water mark.
    const [, unseenQuery] = matching.count.mock.calls;
    expect(unseenQuery[0].where).toMatchObject({
      employee: { id: 'employee-1' },
      isMatched: true,
    });
    expect(unseenQuery[0].where.employeeSeenAt).toBeDefined();
  });

  it('returns matching lists from cache without database access', async () => {
    const cached = [{ id: 'company-1' }];
    redis.get.mockResolvedValue(cached);
    await expect(
      queryService.findCurrentEmployeeMatching({ eid: 'employee-1' }),
    ).resolves.toBe(cached);
    expect(matching.find).not.toHaveBeenCalled();
  });

  it('maps and caches employee matches with their skill scores', async () => {
    matching.find.mockResolvedValue([
      { company, skillScore: 50, isMatched: true },
    ]);
    const result = await queryService.findCurrentEmployeeMatching({
      eid: 'employee-1',
    });
    expect(result[0].skillScore).toBe(50);
    expect(redis.set).toHaveBeenCalled();
  });

  it('counts and caches company matches', async () => {
    matching.count.mockResolvedValue(7);
    const result = await queryService.findCurrentCompanyMatchingCount({
      cid: 'company-1',
    });
    expect(result.count).toBe(7);
    expect(redis.set).toHaveBeenCalled();
  });

  it('maps and caches employee and company likes', async () => {
    matching.find
      .mockResolvedValueOnce([{ company }])
      .mockResolvedValueOnce([{ employee }]);
    await expect(
      queryService.findCurrentEmployeeLiked({ eid: 'employee-1' }),
    ).resolves.toEqual([expect.objectContaining({ id: 'company-1' })]);
    await expect(
      queryService.findCurrentCompanyLiked({ cid: 'company-1' }),
    ).resolves.toEqual([expect.objectContaining({ id: 'employee-1' })]);
    expect(redis.set).toHaveBeenCalledTimes(2);
  });

  it('maps company matches and counts employee matches', async () => {
    matching.find.mockResolvedValueOnce([
      { employee, skillScore: 75, isMatched: true },
    ]);
    const matches = await queryService.findCurrentCompanyMatching({
      cid: 'company-1',
    });
    expect(matches[0]).toEqual(
      expect.objectContaining({ id: 'employee-1', skillScore: 75 }),
    );

    matching.count.mockResolvedValueOnce(6);
    await expect(
      queryService.findCurrentEmployeeMatchingCount({ eid: 'employee-1' }),
    ).resolves.toEqual(expect.objectContaining({ count: 6 }));
  });

  it('wraps list and count database failures consistently', async () => {
    matching.find.mockRejectedValueOnce(new Error('list failed'));
    await expectRpc(
      queryService.findCurrentCompanyMatching({ cid: 'company-1' }),
      500,
      'list failed',
    );
    matching.count.mockRejectedValueOnce(new Error('count failed'));
    await expectRpc(
      queryService.findCurrentEmployeeMatchingCount({ eid: 'employee-1' }),
      500,
      'count failed',
    );
  });

  it('computes skill scores for exact, partial, and unavailable data', () => {
    const compute = computeSkillScore as (e: any, c: any) => number | null;
    expect(compute(employee, company)).toBe(50);
    expect(compute({ ...employee, skills: [] }, company)).toBeNull();
    expect(compute(employee, { ...company, openPositions: [] })).toBeNull();
    expect(
      compute(employee, {
        ...company,
        openPositions: [{ skillsRequired: 'Node.js' }],
      }),
    ).toBe(100);
  });

  it('wraps employee-like, company-like, and unmatch persistence failures', async () => {
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    matching.findOne.mockResolvedValue(null);
    matching.save.mockRejectedValueOnce(new Error('employee like failed'));
    await expectRpc(
      service.employeeLikes({ eid: 'employee-1', cid: 'company-1' }),
      500,
      'employee like failed',
    );

    matching.save.mockRejectedValueOnce(new Error('company like failed'));
    await expectRpc(
      service.companyLikes({ eid: 'employee-1', cid: 'company-1' }),
      500,
      'company like failed',
    );

    matching.findOne.mockResolvedValueOnce({ id: 'match-1' });
    matching.delete.mockRejectedValueOnce(
      Object.assign(new Error('delete failed'), { statusCode: 503 }),
    );
    await expectRpc(
      service.unmatch({ eid: 'employee-1', cid: 'company-1' }),
      503,
      'delete failed',
    );
  });

  it('preserves missing-profile errors for company likes', async () => {
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(null);
    await expectRpc(
      service.companyLikes({ eid: 'employee-1', cid: 'missing' }),
      404,
      'Employee or Company not found.',
    );
  });

  it.each([
    [
      'findCurrentEmployeeLiked',
      { eid: 'employee-1' },
      'Employee Liked not found',
    ],
    [
      'findCurrentCompanyLiked',
      { cid: 'company-1' },
      'Company Liked not found',
    ],
    [
      'findCurrentEmployeeMatching',
      { eid: 'employee-1' },
      'There is no matching.',
    ],
    [
      'findCurrentCompanyMatching',
      { cid: 'company-1' },
      'There is no matching.',
    ],
  ])('contains null repository results in %s', async (method, dto, message) => {
    matching.find.mockResolvedValueOnce(null);
    await expectRpc((queryService as any)[method](dto), 500, message);
  });

  it('covers ignored and empty skill requirements', () => {
    const compute = computeSkillScore as (e: any, c: any) => number | null;
    expect(
      compute(employee, {
        ...company,
        openPositions: [
          { skillsRequired: null },
          { skillsRequired: ' , ' },
          { skillsRequired: 'Rust' },
        ],
      }),
    ).toBe(0);
  });

  it('wraps company-count database failures', async () => {
    matching.count.mockRejectedValueOnce(new Error('company count failed'));
    await expectRpc(
      queryService.findCurrentCompanyMatchingCount({ cid: 'company-1' }),
      500,
      'company count failed',
    );
  });

  it('suppresses notifications when like targets have no linked users', async () => {
    employees.findOne.mockResolvedValue({
      ...employee,
      username: '',
      firstname: 'Fallback',
      avatar: null,
      user: undefined,
    });
    companies.findOne.mockResolvedValue({
      ...company,
      avatar: null,
      user: undefined,
    });
    matching.findOne.mockResolvedValue(null);

    await expect(
      service.employeeLikes({ eid: 'employee-1', cid: 'company-1' }),
    ).resolves.toEqual(expect.objectContaining({ notificationTargets: [] }));
    await expect(
      service.companyLikes({ eid: 'employee-1', cid: 'company-1' }),
    ).resolves.toEqual(expect.objectContaining({ notificationTargets: [] }));
    expect(notifications.emit).not.toHaveBeenCalled();
  });

  it.each([
    ['findCurrentEmployeeLiked', { eid: 'employee-1' }],
    ['findCurrentCompanyLiked', { cid: 'company-1' }],
    ['findCurrentEmployeeMatching', { eid: 'employee-1' }],
    ['findCurrentCompanyMatching', { cid: 'company-1' }],
    ['findCurrentEmployeeMatchingCount', { eid: 'employee-1' }],
    ['findCurrentCompanyMatchingCount', { cid: 'company-1' }],
  ])('returns %s directly from cache', async (method, dto) => {
    const cached = { cached: method };
    redis.get.mockResolvedValueOnce(cached);
    await expect((queryService as any)[method](dto)).resolves.toBe(cached);
  });

  it('uses fallback messages for malformed matching repository failures', async () => {
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    matching.findOne.mockRejectedValueOnce(null);
    await expectRpc(
      service.employeeLikes({ eid: 'employee-1', cid: 'company-1' }),
      500,
      'An error occurred while liking.',
    );

    matching.findOne.mockResolvedValueOnce({ id: 'match-1' });
    matching.delete.mockRejectedValueOnce({ statusCode: 502 });
    await expectRpc(
      service.unmatch({ eid: 'employee-1', cid: 'company-1' }),
      502,
      'An error occurred while unmatching.',
    );
  });

  it.each([
    [
      'findCurrentEmployeeLiked',
      { eid: 'employee-1' },
      'An error occurred while fetching the employee liked.',
    ],
    [
      'findCurrentCompanyLiked',
      { cid: 'company-1' },
      'An error occurred while fetching the company liked.',
    ],
    [
      'findCurrentEmployeeMatching',
      { eid: 'employee-1' },
      'An error occurred while fetching the employee matching.',
    ],
    [
      'findCurrentCompanyMatching',
      { cid: 'company-1' },
      'An error occurred while fetching the company matching.',
    ],
    [
      'findCurrentEmployeeMatchingCount',
      { eid: 'employee-1' },
      'An error occurred while counting the current employee matching.',
    ],
    [
      'findCurrentCompanyMatchingCount',
      { cid: 'company-1' },
      'An error occurred while counting the current company matching.',
    ],
  ])(
    'uses a stable fallback for malformed %s failures',
    async (method, dto, message) => {
      if (method.includes('Count')) {
        matching.count.mockRejectedValueOnce(null);
      } else {
        matching.find.mockRejectedValueOnce(null);
      }
      await expectRpc((queryService as any)[method](dto), 500, message);
    },
  );

  it('maps absent skill scores to null in both match lists', async () => {
    matching.find
      .mockResolvedValueOnce([{ company, isMatched: true }])
      .mockResolvedValueOnce([{ employee, isMatched: true }]);

    await expect(
      queryService.findCurrentEmployeeMatching({ eid: 'employee-1' }),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'company-1', skillScore: null }),
    ]);
    await expect(
      queryService.findCurrentCompanyMatching({ cid: 'company-1' }),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'employee-1', skillScore: null }),
    ]);
  });

  it.each(['employeeLikes', 'companyLikes'])(
    'completes a reciprocal %s when linked email accounts are incomplete',
    async (method) => {
      employees.findOne.mockResolvedValue({
        ...employee,
        username: '',
        firstname: 'Fallback Name',
        avatar: null,
        user: undefined,
      });
      companies.findOne.mockResolvedValue({
        ...company,
        avatar: null,
      });
      matching.findOne.mockResolvedValue({
        employee,
        company,
        employeeLiked: method === 'companyLikes',
        companyLiked: method === 'employeeLikes',
        isMatched: false,
      });

      await expect(
        (service as any)[method]({
          eid: 'employee-1',
          cid: 'company-1',
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          isMatched: true,
          notificationTargets: ['company-user'],
        }),
      );
      expect(notifications.emit).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ senderAvatar: null }),
        }),
      );
    },
  );

  it('ignores unnamed employee skills when calculating a score', () => {
    const compute = computeSkillScore as (e: any, c: any) => number | null;
    expect(
      compute(
        {
          ...employee,
          skills: [{ name: null }, { name: ' TypeScript ' }],
        },
        company,
      ),
    ).toBe(50);
    expect(
      compute({ ...employee, skills: [{ name: null }] }, company),
    ).toBeNull();
  });
});
