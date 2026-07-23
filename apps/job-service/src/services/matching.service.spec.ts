import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { MatchingService } from './matching.service';

describe('MatchingService', () => {
  const matching = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const employees = { findOne: jest.fn() };
  const companies = { findOne: jest.fn() };
  const employeeFavorites = { delete: jest.fn(), count: jest.fn() };
  const companyFavorites = { delete: jest.fn(), count: jest.fn() };
  const interviews = { delete: jest.fn() };
  const email = { sendEmail: jest.fn() };
  const logger = { error: jest.fn(), warn: jest.fn() };
  const redis = {
    invalidateMatchingCaches: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    generateMatchingKey: jest.fn((kind, id) => `${kind}:${id}`),
    generateEmployeeFavoritesKey: jest.fn(() => 'employee-favorites'),
    generateEmployeeFavoriteCountKey: jest.fn(() => 'employee-favorite-count'),
    generateCompanyFavoritesKey: jest.fn(() => 'company-favorites'),
    generateCompanyFavoriteCountKey: jest.fn(() => 'company-favorite-count'),
  };
  const config = { get: jest.fn(() => 'test-key') };
  const notifications = { emit: jest.fn() };
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
    config as any,
    notifications as any,
  );

  const employee = {
    id: 'employee-1',
    username: 'Applicant',
    avatar: 'employee.png',
    user: { id: 'employee-user', email: 'employee@example.com' },
    skills: [{ name: 'TypeScript' }, { name: 'Node.js' }],
  };
  const company = {
    id: 'company-1',
    name: 'Apsara',
    avatar: 'company.png',
    user: { id: 'company-user', email: 'company@example.com' },
    openPositions: [{ skillsRequired: 'TypeScript, PostgreSQL' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    matching.save.mockImplementation(async (value) => ({
      id: 'match-1',
      ...value,
    }));
    email.sendEmail.mockResolvedValue(undefined);
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

  it('returns normalized profiles for AI matching', async () => {
    employees.findOne.mockResolvedValue({
      ...employee,
      job: 'Engineer',
      educations: [{ degree: 'BSc', school: 'RUPP' }],
      experiences: [{ title: 'Developer' }],
      careerScopes: [{ name: 'Software' }],
    });
    companies.findOne.mockResolvedValue({
      ...company,
      industry: 'Technology',
      careerScopes: [{ name: 'Software' }],
    });

    const result = await service.getAiMatchProfiles({
      eid: 'employee-1',
      cid: 'company-1',
    });
    expect(result.employeeProfile.skills).toEqual(['TypeScript', 'Node.js']);
    expect(result.companyProfile.openPositions[0]).toEqual(
      expect.objectContaining({ skillsRequired: 'TypeScript, PostgreSQL' }),
    );
  });

  it('rejects AI profile generation for missing records', async () => {
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(null);
    await expectRpc(
      service.getAiMatchProfiles({ eid: 'employee-1', cid: 'company-1' }),
      404,
      'Employee or Company not found.',
    );
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

  it('returns cached AI explanations without loading profiles', async () => {
    const cached = { score: 90, verdict: 'Strong Match' };
    redis.get.mockResolvedValueOnce(cached);
    await expect(
      service.getAiMatchExplanation({ eid: 'employee-1', cid: 'company-1' }),
    ).resolves.toBe(cached);
    expect(employees.findOne).not.toHaveBeenCalled();
  });

  it('generates, normalizes, and caches an AI match explanation', async () => {
    employees.findOne.mockResolvedValue({
      ...employee,
      job: 'Engineer',
      careerScopes: [{ name: 'Software' }],
      educations: [{ degree: 'BSc', school: 'RUPP' }],
      experiences: [{ title: 'Developer' }],
    });
    companies.findOne.mockResolvedValue({
      ...company,
      careerScopes: [{ name: 'Software' }],
      benefits: [],
      values: [],
    });
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              score: 88,
              verdict: 'Strong Match',
              explanation: 'Relevant experience.',
              strengths: ['TypeScript'],
              gaps: ['PostgreSQL'],
            }),
          },
        },
      ],
    });
    (service as any).openAI = { chat: { completions: { create } } };
    const result = await service.getAiMatchExplanation({
      eid: 'employee-1',
      cid: 'company-1',
    });
    expect(result).toEqual(
      expect.objectContaining({ score: 88, verdict: 'Strong Match' }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ response_format: { type: 'json_object' } }),
    );
    expect(redis.set).toHaveBeenCalled();
  });

  it('generates interview preparation tailored to the requested round', async () => {
    employees.findOne.mockResolvedValue({
      ...employee,
      job: 'Engineer',
      careerScopes: [],
      educations: [],
      experiences: [],
    });
    companies.findOne.mockResolvedValue({
      ...company,
      values: [{ label: 'Growth' }],
      careerScopes: [],
    });
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              questions: [
                {
                  question: 'Explain event loops.',
                  questionKm: 'ពន្យល់ event loop។',
                  category: 'Technical',
                  tip: 'Use an example.',
                  tipKm: 'ប្រើឧទាហរណ៍។',
                },
              ],
            }),
          },
        },
      ],
    });
    (service as any).openAI = { chat: { completions: { create } } };
    const result = await service.getAiInterviewPrep({
      eid: 'employee-1',
      cid: 'company-1',
      interviewTitle: 'Technical Round',
    });
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]).toEqual(
      expect.objectContaining({ category: 'Technical' }),
    );
    expect(redis.generateMatchingKey).toHaveBeenCalledWith(
      'ai-interview-prep:employee-1:technical-round',
      'company-1',
    );
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

  it('wraps analytics and company-count database failures', async () => {
    matching.count.mockRejectedValueOnce(new Error('analytics failed'));
    await expectRpc(
      service.getMatchingAnalytics({ role: 'employee', userId: 'employee-1' }),
      500,
      'analytics failed',
    );
    matching.count.mockRejectedValueOnce(new Error('company count failed'));
    await expectRpc(
      service.findCurrentCompanyMatchingCount({ cid: 'company-1' }),
      500,
      'company count failed',
    );
  });

  it('contains missing profiles and malformed AI explanation output', async () => {
    employees.findOne.mockResolvedValueOnce(null);
    companies.findOne.mockResolvedValueOnce(company);
    const missing = await service
      .getAiMatchExplanation({ eid: 'missing', cid: 'company-1' })
      .catch((error) => error as RpcException);
    expect(missing).toBeInstanceOf(RpcException);

    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    (service as any).openAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'not-json' } }],
          }),
        },
      },
    };
    const malformed = await service
      .getAiMatchExplanation({ eid: 'employee-1', cid: 'company-1' })
      .catch((error) => error as RpcException);
    expect(malformed).toBeInstanceOf(RpcException);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(SyntaxError) }),
      'AI match explanation failed',
    );
  });

  it('contains missing profiles and malformed AI interview-prep output', async () => {
    employees.findOne.mockResolvedValueOnce(employee);
    companies.findOne.mockResolvedValueOnce(null);
    await expect(
      service.getAiInterviewPrep({
        eid: 'employee-1',
        cid: 'missing',
        interviewTitle: 'Round',
      }),
    ).rejects.toBeInstanceOf(RpcException);

    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    (service as any).openAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: '{broken' } }],
          }),
        },
      },
    };
    await expect(
      service.getAiInterviewPrep({
        eid: 'employee-1',
        cid: 'company-1',
        interviewTitle: 'Round',
      }),
    ).rejects.toBeInstanceOf(RpcException);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(SyntaxError) }),
      'AI interview prep failed',
    );
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

  it('serializes complete interview-preparation profiles', async () => {
    employees.findOne.mockResolvedValue({
      ...employee,
      job: 'Engineer',
      yearsOfExperience: '4 years',
      description: 'Backend systems',
      careerScopes: [{ name: 'Software' }],
      educations: [{ degree: 'BSc', school: 'RUPP', year: '2024' }],
      experiences: [
        {
          title: 'Developer',
          description: 'Built APIs',
          startDate: '2023',
          endDate: null,
        },
      ],
    });
    companies.findOne.mockResolvedValue({
      ...company,
      industry: 'Technology',
      description: 'Hiring engineers',
      values: [{ label: 'Growth' }],
      careerScopes: [{ name: 'Software' }],
      openPositions: [
        {
          title: 'Backend Engineer',
          skillsRequired: 'TypeScript',
          experienceRequired: '3 years',
          type: 'full-time',
        },
      ],
    });
    const create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ questions: [] }) } }],
    });
    (service as any).openAI = { chat: { completions: { create } } };
    await service.getAiInterviewPrep({
      eid: 'employee-1',
      cid: 'company-1',
      interviewTitle: 'Technical',
    });
    const prompt = create.mock.calls[0][0].messages[1].content;
    expect(prompt).toContain('RUPP');
    expect(prompt).toContain('Built APIs');
    expect(prompt).toContain('Backend Engineer');
    expect(prompt).toContain('Software');
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

  it('uses safe defaults for incomplete AI responses', async () => {
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    const create = jest
      .fn()
      .mockResolvedValueOnce({ choices: [] })
      .mockResolvedValueOnce({
        choices: [
          { message: { content: JSON.stringify({ questions: [{}] }) } },
        ],
      });
    (service as any).openAI = { chat: { completions: { create } } };

    await expect(
      service.getAiMatchExplanation({ eid: 'employee-1', cid: 'company-1' }),
    ).resolves.toEqual(
      expect.objectContaining({
        score: 0,
        verdict: 'Unknown',
        strengths: [],
        gaps: [],
      }),
    );
    await expect(
      service.getAiInterviewPrep({
        eid: 'employee-1',
        cid: 'company-1',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        questions: [
          {
            question: '',
            questionKm: '',
            category: 'General',
            tip: '',
            tipKm: '',
          },
        ],
      }),
    );
  });

  it('uses stable messages for non-Error AI failures', async () => {
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    (service as any).openAI = {
      chat: { completions: { create: jest.fn().mockRejectedValue('offline') } },
    };
    const explanation = (await service
      .getAiMatchExplanation({ eid: 'employee-1', cid: 'company-1' })
      .catch((error) => error)) as RpcException;
    expect(explanation.getError()).toBe('AI match explanation failed');

    const prep = (await service
      .getAiInterviewPrep({ eid: 'employee-1', cid: 'company-1' })
      .catch((error) => error)) as RpcException;
    expect(prep.getError()).toBe('AI interview prep failed');
  });
});
