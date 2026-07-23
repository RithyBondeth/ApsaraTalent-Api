import 'reflect-metadata';
import { MatchingService } from './matching.service';
import { createMatchingFixtures, expectRpc } from './matching-test-fixtures';

describe('MatchingService', () => {
  const {
    matching,
    employees,
    companies,
    employeeFavorites,
    companyFavorites,
    interviews,
    email,
    logger,
    redis,
    notifications,
    employee,
    company,
  } = createMatchingFixtures();

  const service = new MatchingService(
    matching as any,
    employees as any,
    companies as any,
    employeeFavorites as any,
    companyFavorites as any,
    interviews as any,
    email as any,
    logger as any,
    redis as any,
    notifications as any,
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
    expect(notifications.emit).toHaveBeenCalledTimes(2);
    expect(email.sendEmail).toHaveBeenCalled();
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

  it('returns matching lists from cache without database access', async () => {
    const cached = [{ id: 'company-1' }];
    redis.get.mockResolvedValue(cached);
    await expect(
      service.findCurrentEmployeeMatching({ eid: 'employee-1' }),
    ).resolves.toBe(cached);
    expect(matching.find).not.toHaveBeenCalled();
  });

  it('maps and caches employee matches with their skill scores', async () => {
    matching.find.mockResolvedValue([
      { company, skillScore: 50, isMatched: true },
    ]);
    const result = await service.findCurrentEmployeeMatching({
      eid: 'employee-1',
    });
    expect(result[0].skillScore).toBe(50);
    expect(redis.set).toHaveBeenCalled();
  });

  it('counts and caches company matches', async () => {
    matching.count.mockResolvedValue(7);
    const result = await service.findCurrentCompanyMatchingCount({
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
      service.findCurrentEmployeeLiked({ eid: 'employee-1' }),
    ).resolves.toEqual([expect.objectContaining({ id: 'company-1' })]);
    await expect(
      service.findCurrentCompanyLiked({ cid: 'company-1' }),
    ).resolves.toEqual([expect.objectContaining({ id: 'employee-1' })]);
    expect(redis.set).toHaveBeenCalledTimes(2);
  });

  it('maps company matches and counts employee matches', async () => {
    matching.find.mockResolvedValueOnce([
      { employee, skillScore: 75, isMatched: true },
    ]);
    const matches = await service.findCurrentCompanyMatching({
      cid: 'company-1',
    });
    expect(matches[0]).toEqual(
      expect.objectContaining({ id: 'employee-1', skillScore: 75 }),
    );

    matching.count.mockResolvedValueOnce(6);
    await expect(
      service.findCurrentEmployeeMatchingCount({ eid: 'employee-1' }),
    ).resolves.toEqual(expect.objectContaining({ count: 6 }));
  });

  it('wraps list and count database failures consistently', async () => {
    matching.find.mockRejectedValueOnce(new Error('list failed'));
    await expectRpc(
      service.findCurrentCompanyMatching({ cid: 'company-1' }),
      500,
      'list failed',
    );
    matching.count.mockRejectedValueOnce(new Error('count failed'));
    await expectRpc(
      service.findCurrentEmployeeMatchingCount({ eid: 'employee-1' }),
      500,
      'count failed',
    );
  });

  it('computes skill scores for exact, partial, and unavailable data', () => {
    const compute = (service as any).computeSkillScore.bind(service);
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
    await expectRpc((service as any)[method](dto), 500, message);
  });

  it('contains email failures after reciprocal matches', async () => {
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    matching.findOne.mockResolvedValue({
      employee,
      company,
      employeeLiked: false,
      companyLiked: true,
      isMatched: false,
    });
    email.sendEmail.mockRejectedValueOnce(new Error('SMTP down'));
    await service.employeeLikes({ eid: 'employee-1', cid: 'company-1' });
    await new Promise((resolve) => setImmediate(resolve));
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to send match notification: SMTP down',
    );

    matching.findOne.mockResolvedValue({
      employee,
      company,
      employeeLiked: true,
      companyLiked: false,
      isMatched: false,
    });
    email.sendEmail.mockRejectedValueOnce('offline');
    await service.companyLikes({ eid: 'employee-1', cid: 'company-1' });
    await new Promise((resolve) => setImmediate(resolve));
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to send match notification: offline',
    );
  });

  it('covers ignored and empty skill requirements', () => {
    const compute = (service as any).computeSkillScore.bind(service);
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
      service.findCurrentCompanyMatchingCount({ cid: 'company-1' }),
      500,
      'company count failed',
    );
  });
});
