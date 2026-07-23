import 'reflect-metadata';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  const users = {
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    query: jest.fn(),
  };
  const scopes = { find: jest.fn(), createQueryBuilder: jest.fn() };
  const matches = {};
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const redis = {
    generateListKey: jest.fn(() => 'users'),
    generateUserKey: jest.fn((_type, id) => `user:${id}`),
    generateEmployeeFavoritesKey: jest.fn(() => 'employee-favorites'),
    generateEmployeeFavoriteCountKey: jest.fn(() => 'employee-favorite-count'),
    generateCompanyFavoritesKey: jest.fn(() => 'company-favorites'),
    generateCompanyFavoriteCountKey: jest.fn(() => 'company-favorite-count'),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clearUserDetailCache: jest.fn(),
  };

  const service = new RecommendationsService(
    users as any,
    scopes as any,
    matches as any,
    logger as any,
    redis as any,
  );

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue(undefined);
    redis.del.mockResolvedValue(undefined);
  });

  function recommendationBuilder(options: {
    one?: any;
    many?: any[];
    raw?: any[];
  }) {
    const qb: any = {};
    for (const method of [
      'select',
      'addSelect',
      'leftJoinAndSelect',
      'innerJoinAndSelect',
      'innerJoin',
      'where',
      'andWhere',
      'groupBy',
      'limit',
    ]) {
      qb[method] = jest.fn(() => qb);
    }
    qb.getOne = jest.fn().mockResolvedValue(options.one ?? null);
    qb.getMany = jest.fn().mockResolvedValue(options.many ?? []);
    qb.getRawMany = jest.fn().mockResolvedValue(options.raw ?? []);
    return qb;
  }

  it('covers recommendation input helpers and block lookup', async () => {
    const internal = service as any;
    expect(internal.clampRecoLimit(undefined)).toBe(10);
    expect(internal.clampRecoLimit(-4)).toBe(10);
    expect(internal.clampRecoLimit(80)).toBe(50);
    expect(internal.clampRecoLimit(2.9)).toBe(2);
    expect(internal.vectorCentroid([])).toBeNull();
    expect(internal.vectorCentroid([[0, 0]])).toBeNull();
    expect(internal.vectorCentroid([[3, 4], [3, 4], [1]])).toEqual([0.6, 0.8]);
    expect(internal.toVectorLiteral([1, 2])).toBe('[1,2]');
    expect(internal.normalizeDegree('Master of Science')).toBeGreaterThan(
      internal.normalizeDegree('Bachelor degree'),
    );
    expect(internal.normalizeDegree('Associate diploma')).toBe(2);
    expect(internal.normalizeDegree('High school certificate')).toBe(1);
    expect(internal.normalizeDegree('Professional certificate')).toBe(0);
    expect(internal.normalizeDegree(null)).toBe(0);
    expect(internal.extractYears('at least 4 years')).toBe(4);
    expect(internal.extractYears('')).toBe(0);
    expect(internal.extractYears('experienced')).toBe(0);
    expect(
      internal.extractKeywords('The senior TypeScript platform engineer'),
    ).toEqual(
      expect.arrayContaining(['senior', 'typescript', 'platform', 'engineer']),
    );

    users.query
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce([]);
    await expect(internal.requesterHasBlocks('user-1')).resolves.toBe(true);
    await expect(internal.requesterHasBlocks('user-2')).resolves.toBe(false);
  });

  it('performs nearest-scope vector lookup', async () => {
    const qb: any = {};
    for (const method of [
      'select',
      'where',
      'orderBy',
      'setParameter',
      'limit',
    ]) {
      qb[method] = jest.fn(() => qb);
    }
    qb.getRawMany = jest
      .fn()
      .mockResolvedValue([{ id: 'scope-1' }, { id: 'scope-2' }]);
    scopes.createQueryBuilder.mockReturnValue(qb);
    await expect(
      (service as any).nearestScopeIds([0.1, 0.2], 2),
    ).resolves.toEqual(['scope-1', 'scope-2']);
    expect(qb.setParameter).toHaveBeenCalledWith('qvec', '[0.1,0.2]');
  });

  it('ranks and enriches company recommendations for an employee', async () => {
    const employee = {
      id: 'employee-1',
      skills: [{ name: 'TypeScript' }],
      careerScopes: [{ id: 'scope-1', embedding: '[1,0]' }],
      educations: [{ degree: 'Bachelor' }],
      job: 'Backend Developer',
      yearsOfExperience: '3 years',
      description: 'Scalable TypeScript services',
      location: 'Phnom Penh',
      jobEmbedding: '[1,0]',
    };
    const company = {
      id: 'company-1',
      name: 'Apsara',
      location: 'Phnom Penh',
      careerScopes: [{ id: 'scope-1', embedding: '[1,0]' }],
      openPositions: [
        {
          id: 'job-1',
          title: 'Backend Developer',
          description: 'Build scalable TypeScript services',
          skillsRequired: 'TypeScript, PostgreSQL',
          educationRequired: 'Master',
          experienceRequired: '4 years',
          titleEmbedding: '[1,0]',
        },
      ],
    };
    const builders = [
      recommendationBuilder({ one: { id: 'employee-user', employee } }),
      recommendationBuilder({ raw: [{ userId: 'company-user' }] }),
      recommendationBuilder({ raw: [] }),
      recommendationBuilder({
        many: [
          { id: 'company-user', company: { ...company, openPositions: [] } },
        ],
      }),
      recommendationBuilder({ many: [{ id: 'company-user', company }] }),
      recommendationBuilder({
        many: [
          {
            id: 'company-user',
            company: {
              id: 'company-1',
              benefits: [{ id: 1 }],
              values: [{ id: 2 }],
            },
          },
        ],
      }),
    ];
    users.createQueryBuilder
      .mockReturnValueOnce(builders[0])
      .mockReturnValueOnce(builders[1])
      .mockReturnValueOnce(builders[2])
      .mockReturnValueOnce(builders[3])
      .mockReturnValueOnce(builders[4])
      .mockReturnValueOnce(builders[5]);
    jest
      .spyOn(service as any, 'nearestScopeIds')
      .mockResolvedValue(['scope-1']);
    users.query.mockResolvedValueOnce([]);
    const liked = recommendationBuilder({
      raw: [{ companyId: 'liked-company' }, { companyId: null }],
    });
    (matches as any).createQueryBuilder = jest.fn(() => liked);

    const result = await service.getEmployeeRecommendations({
      employeeId: 'employee-1',
      limit: 5,
      requesterId: 'employee-user',
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'company-1',
        benefits: [{ id: 1 }],
        values: [{ id: 2 }],
      }),
    );
    expect(redis.set).toHaveBeenCalledWith('users', result, expect.any(Number));
  });

  it('ranks fully stitched employee recommendations for a company', async () => {
    const company = {
      id: 'company-1',
      location: 'Phnom Penh',
      careerScopes: [{ id: 'scope-1', embedding: '[1,0]' }],
      openPositions: [
        {
          title: 'Backend Developer',
          description: 'Build scalable TypeScript services',
          skillsRequired: 'TypeScript, PostgreSQL',
          educationRequired: 'Master',
          experienceRequired: '4 years',
          titleEmbedding: '[1,0]',
        },
      ],
    };
    const baseEmployee = {
      id: 'employee-1',
      job: 'Backend Developer',
      description: 'Scalable TypeScript services',
      location: 'Phnom Penh',
      yearsOfExperience: '3 years',
      availability: 'available',
      jobEmbedding: '[1,0]',
    };
    const builders = [
      recommendationBuilder({ one: { id: 'company-user', company } }),
      recommendationBuilder({ raw: [{ userId: 'employee-user' }] }),
      recommendationBuilder({ raw: [] }),
      recommendationBuilder({
        many: [{ id: 'employee-user', employee: { ...baseEmployee } }],
      }),
      recommendationBuilder({
        many: [
          {
            id: 'employee-user',
            employee: { id: 'employee-1', careerScopes: [{ id: 'scope-1' }] },
          },
        ],
      }),
      recommendationBuilder({
        many: [
          {
            id: 'employee-user',
            employee: { id: 'employee-1', skills: [{ name: 'TypeScript' }] },
          },
        ],
      }),
      recommendationBuilder({
        many: [
          {
            id: 'employee-user',
            employee: {
              id: 'employee-1',
              experiences: [{ title: 'Backend Developer' }],
            },
          },
        ],
      }),
      recommendationBuilder({
        many: [
          {
            id: 'employee-user',
            employee: {
              id: 'employee-1',
              educations: [{ degree: 'Bachelor' }],
            },
          },
        ],
      }),
    ];
    for (const builder of builders)
      users.createQueryBuilder.mockReturnValueOnce(builder);
    jest
      .spyOn(service as any, 'nearestScopeIds')
      .mockResolvedValue(['scope-1']);
    users.query.mockResolvedValueOnce([]);
    (matches as any).createQueryBuilder = jest.fn(() =>
      recommendationBuilder({
        raw: [{ employeeId: 'liked-employee' }, { employeeId: null }],
      }),
    );

    const result = await service.getCompanyRecommendations({
      companyId: 'company-1',
      limit: 5,
      requesterId: 'company-user',
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'employee-1',
        skills: [expect.objectContaining({ name: 'TypeScript' })],
      }),
    );
    expect(redis.set).toHaveBeenCalledWith('users', result, expect.any(Number));
  });

  it('caches an empty unrelated employee recommendation page', async () => {
    const emptyEmployee = {
      id: 'employee-1',
      skills: [],
      careerScopes: [],
      educations: [],
      job: '',
      yearsOfExperience: '',
      description: '',
      location: '',
      jobEmbedding: null,
    };
    const unrelatedCompany = {
      id: 'company-1',
      location: '',
      careerScopes: [],
      openPositions: [
        {
          title: '',
          description: '',
          skillsRequired: '',
          educationRequired: '',
          experienceRequired: '',
          titleEmbedding: null,
        },
      ],
    };
    const builders = [
      recommendationBuilder({ one: { employee: emptyEmployee } }),
      recommendationBuilder({ raw: [{ userId: 'company-user' }] }),
      recommendationBuilder({
        many: [
          {
            id: 'company-user',
            company: { ...unrelatedCompany, openPositions: [] },
          },
        ],
      }),
      recommendationBuilder({
        many: [{ id: 'company-user', company: unrelatedCompany }],
      }),
    ];
    for (const builder of builders) {
      users.createQueryBuilder.mockReturnValueOnce(builder);
    }
    (matches as any).createQueryBuilder = jest.fn(() =>
      recommendationBuilder({ raw: [] }),
    );

    await expect(
      service.getEmployeeRecommendations({ employeeId: 'employee-1' }),
    ).resolves.toEqual([]);
    expect(redis.set).toHaveBeenCalledWith('users', [], expect.any(Number));
  });

  it('does not cache empty recommendations for a requester with blocks', async () => {
    users.query.mockResolvedValueOnce([{ '?column?': 1 }]);
    users.createQueryBuilder
      .mockReturnValueOnce(
        recommendationBuilder({
          one: {
            company: {
              id: 'company-1',
              careerScopes: [],
              openPositions: [],
            },
          },
        }),
      )
      .mockReturnValueOnce(recommendationBuilder({ raw: [] }));
    (matches as any).createQueryBuilder = jest.fn(() =>
      recommendationBuilder({ raw: [] }),
    );

    await expect(
      service.getCompanyRecommendations({
        companyId: 'company-1',
        requesterId: 'company-user',
      }),
    ).resolves.toEqual([]);
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('uses keyword title scoring when employee embeddings are unavailable', async () => {
    const employee = {
      id: 'employee-1',
      skills: [{ name: 'TypeScript' }],
      careerScopes: [{ id: 'scope-1' }],
      educations: [],
      job: 'Backend Developer',
      yearsOfExperience: '',
      description: '',
      location: '',
      jobEmbedding: null,
    };
    const company = {
      id: 'company-1',
      careerScopes: [{ id: 'scope-1' }],
      openPositions: [
        {
          title: 'Backend Engineer',
          description: 'Developer platform',
          skillsRequired: 'TypeScript',
          educationRequired: '',
          experienceRequired: '',
          titleEmbedding: null,
        },
      ],
    };
    const builders = [
      recommendationBuilder({ one: { employee } }),
      recommendationBuilder({ raw: [{ userId: 'company-user' }] }),
      recommendationBuilder({
        many: [
          { id: 'company-user', company: { ...company, openPositions: [] } },
        ],
      }),
      recommendationBuilder({ many: [{ id: 'company-user', company }] }),
      recommendationBuilder({
        many: [
          {
            company: { id: 'company-1', benefits: [], values: [] },
          },
        ],
      }),
    ];
    for (const builder of builders) {
      users.createQueryBuilder.mockReturnValueOnce(builder);
    }
    (matches as any).createQueryBuilder = jest.fn(() =>
      recommendationBuilder({ raw: [] }),
    );

    await expect(
      service.getEmployeeRecommendations({ employeeId: 'employee-1' }),
    ).resolves.toHaveLength(1);
  });

  it('uses employee job and experience keywords without job embeddings', async () => {
    const company = {
      id: 'company-1',
      careerScopes: [{ id: 'scope-1' }],
      openPositions: [
        {
          title: 'Backend Developer',
          description: 'TypeScript platform',
          skillsRequired: 'TypeScript',
          educationRequired: '',
          experienceRequired: '',
          titleEmbedding: null,
        },
      ],
    };
    const employee = {
      id: 'employee-1',
      job: 'Backend Developer',
      description: 'TypeScript platform',
      location: '',
      yearsOfExperience: '',
      availability: 'available',
      jobEmbedding: null,
    };
    const builders = [
      recommendationBuilder({ one: { company } }),
      recommendationBuilder({ raw: [{ userId: 'employee-user' }] }),
      recommendationBuilder({ many: [{ id: 'employee-user', employee }] }),
      recommendationBuilder({
        many: [
          {
            id: 'employee-user',
            employee: { id: 'employee-1', careerScopes: [{ id: 'scope-1' }] },
          },
        ],
      }),
      recommendationBuilder({
        many: [
          {
            id: 'employee-user',
            employee: { id: 'employee-1', skills: [{ name: 'TypeScript' }] },
          },
        ],
      }),
      recommendationBuilder({
        many: [
          {
            id: 'employee-user',
            employee: {
              id: 'employee-1',
              experiences: [{ title: 'Platform Engineer' }],
            },
          },
        ],
      }),
      recommendationBuilder({
        many: [
          {
            id: 'employee-user',
            employee: { id: 'employee-1', educations: [] },
          },
        ],
      }),
    ];
    for (const builder of builders) {
      users.createQueryBuilder.mockReturnValueOnce(builder);
    }
    (matches as any).createQueryBuilder = jest.fn(() =>
      recommendationBuilder({ raw: [] }),
    );

    await expect(
      service.getCompanyRecommendations({ companyId: 'company-1' }),
    ).resolves.toHaveLength(1);
  });

  it('uses recommendation caches and contains recommendation-query failures', async () => {
    const cached = [{ id: 'cached' }];
    redis.get.mockResolvedValueOnce(cached);
    await expect(
      service.getEmployeeRecommendations({ employeeId: 'employee-1' }),
    ).resolves.toBe(cached);
    redis.get.mockResolvedValueOnce(cached);
    await expect(
      service.getCompanyRecommendations({ companyId: 'company-1' }),
    ).resolves.toBe(cached);

    redis.get.mockResolvedValueOnce(null);
    users.createQueryBuilder.mockImplementationOnce(() => {
      throw new Error('recommendation database failed');
    });
    await expect(
      service.getEmployeeRecommendations({ employeeId: 'employee-1' }),
    ).resolves.toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('recommendation database failed'),
    );
  });

  it('contains company recommendation-query failures', async () => {
    users.createQueryBuilder.mockImplementationOnce(() => {
      throw new Error('company recommendation database failed');
    });
    await expect(
      service.getCompanyRecommendations({ companyId: 'company-1' }),
    ).resolves.toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('company recommendation database failed'),
    );
  });
});
