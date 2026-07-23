import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { UserService } from './user.service';

describe('UserService', () => {
  const users = {
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    query: jest.fn(),
  };
  const scopes = { find: jest.fn(), createQueryBuilder: jest.fn() };
  const employeeFavorites = {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };
  const companyFavorites = {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };
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
  const events = { emit: jest.fn() };
  const service = new UserService(
    users as any,
    scopes as any,
    employeeFavorites as any,
    companyFavorites as any,
    matches as any,
    logger as any,
    redis as any,
    events as any,
  );

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue(undefined);
    redis.del.mockResolvedValue(undefined);
  });

  function queryBuilder(result: any[]) {
    const qb: Record<string, jest.Mock> = {};
    for (const method of [
      'select',
      'leftJoinAndSelect',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ])
      qb[method] = jest.fn(() => qb);
    qb.getMany = jest.fn().mockResolvedValue(result);
    qb.where = jest.fn(() => qb);
    qb.getOne = jest.fn().mockResolvedValue(result[0] ?? null);
    return qb;
  }

  it('returns a cached user page without querying the database', async () => {
    const cached = [{ id: 'user-1' }];
    redis.get.mockResolvedValue(cached);
    await expect(service.findAllUsers({})).resolves.toBe(cached);
    expect(users.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('loads, maps, paginates, and caches users', async () => {
    const qb = queryBuilder([
      { id: 'user-1', role: 'employee', employee: { id: 'employee-1' } },
    ]);
    users.createQueryBuilder.mockReturnValue(qb);
    const result = await service.findAllUsers({ skip: 10, limit: 5 });
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(result).toHaveLength(1);
    expect(redis.set).toHaveBeenCalled();
  });

  it('counts users with cache support', async () => {
    users.count.mockResolvedValue(20);
    const result = await service.countAllUsers();
    expect(result.totalUsers).toBe(20);
    expect(redis.set).toHaveBeenCalled();
  });

  it('returns cached counts and maps database failures to RPC errors', async () => {
    const cached = { totalUsers: 7 };
    redis.get.mockResolvedValueOnce(cached);
    await expect(service.countAllUsers()).resolves.toBe(cached);
    expect(users.count).not.toHaveBeenCalled();

    redis.get.mockResolvedValueOnce(null);
    users.count.mockRejectedValueOnce(new Error('count failed'));
    const error = (await service
      .countAllUsers()
      .catch((value) => value)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 500,
      message: 'count failed',
    });
  });

  it('loads and caches one fully-related user', async () => {
    const qb = queryBuilder([
      {
        id: 'user-1',
        employee: { id: 'employee-1', skills: [] },
        company: { id: 'company-1', openPositions: [{ id: 'job-1' }] },
      },
    ]);
    users.createQueryBuilder.mockReturnValue(qb);
    const result = await service.findOneUserByID({ userId: 'user-1' });
    expect(qb.where).toHaveBeenCalledWith('user.id = :userId', {
      userId: 'user-1',
    });
    expect(result.id).toBe('user-1');
    expect(redis.set).toHaveBeenCalledWith(
      'user:user-1',
      result,
      expect.any(Number),
    );
  });

  it('returns a cached user detail without querying', async () => {
    const cached = { id: 'user-1' };
    redis.get.mockResolvedValue(cached);
    await expect(service.findOneUserByID({ userId: 'user-1' })).resolves.toBe(
      cached,
    );
    expect(users.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('reports missing users and user-query failures as RPC errors', async () => {
    users.createQueryBuilder.mockReturnValueOnce(queryBuilder([]));
    const missing = (await service
      .findOneUserByID({ userId: 'missing' })
      .catch((value) => value)) as RpcException;
    expect(missing.getError()).toEqual({
      statusCode: 500,
      message: 'There is no user with this id',
    });

    users.createQueryBuilder.mockImplementationOnce(() => {
      throw new Error('query failed');
    });
    const failed = (await service
      .findOneUserByID({ userId: 'user-1' })
      .catch((value) => value)) as RpcException;
    expect(failed.getError()).toEqual({
      statusCode: 500,
      message: 'query failed',
    });
  });

  it('normalizes blank push tokens to null and clears detail cache', async () => {
    users.update.mockResolvedValue({ affected: 1 });
    await service.updatePushNotificationToken({
      userId: 'user-1',
      token: '   ',
    });
    expect(users.update).toHaveBeenCalledWith(
      { id: 'user-1' },
      { pushNotificationToken: null },
    );
    expect(redis.clearUserDetailCache).toHaveBeenCalledWith('user-1');
  });

  it('returns 404 when updating a missing user push token', async () => {
    users.update.mockResolvedValue({ affected: 0 });
    const error = (await service
      .updatePushNotificationToken({
        userId: 'missing',
        token: 'token',
      })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 404,
      message: 'There is no user with this id',
    });
  });

  it('prevents duplicate employee favorites', async () => {
    employeeFavorites.findOne.mockResolvedValue({ id: 'favorite-1' });
    const error = (await service
      .employeeFavoriteCompany({
        eid: 'employee-1',
        cid: 'company-1',
      })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 400,
      message: 'Already favorited',
    });
  });

  it('creates an employee favorite and invalidates both sides', async () => {
    employeeFavorites.findOne.mockResolvedValue(null);
    await service.employeeFavoriteCompany({
      eid: 'employee-1',
      cid: 'company-1',
    });
    expect(employeeFavorites.save).toHaveBeenCalledWith({
      employee: { id: 'employee-1' },
      company: { id: 'company-1' },
    });
    expect(redis.del).toHaveBeenCalledTimes(4);
    expect(events.emit).toHaveBeenCalledTimes(2);
  });

  it('prevents removal of another employee’s favorite', async () => {
    employeeFavorites.findOne.mockResolvedValue(null);
    const error = (await service
      .employeeUnfavoriteCompany({
        eid: 'employee-1',
        cid: 'company-1',
        favoriteId: 'other-favorite',
      })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual(
      expect.objectContaining({ statusCode: 404 }),
    );
    expect(employeeFavorites.remove).not.toHaveBeenCalled();
  });

  it('creates company favorites symmetrically', async () => {
    companyFavorites.findOne.mockResolvedValue(null);
    await service.companyFavoriteEmployee({
      cid: 'company-1',
      eid: 'employee-1',
    });
    expect(companyFavorites.save).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledTimes(4);
  });

  it('removes employee and company favorites and invalidates both caches', async () => {
    employeeFavorites.findOne.mockResolvedValueOnce({ id: 'ef-1' });
    await expect(
      service.employeeUnfavoriteCompany({
        eid: 'employee-1',
        cid: 'company-1',
        favoriteId: 'ef-1',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        message: 'Successfully removed company from favorites',
      }),
    );
    expect(employeeFavorites.remove).toHaveBeenCalledWith({ id: 'ef-1' });

    companyFavorites.findOne.mockResolvedValueOnce({ id: 'cf-1' });
    await expect(
      service.companyUnfavoriteEmployee({
        cid: 'company-1',
        eid: 'employee-1',
        favoriteId: 'cf-1',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        message: 'Successfully removed employee from favorites',
      }),
    );
    expect(companyFavorites.remove).toHaveBeenCalledWith({ id: 'cf-1' });
    expect(events.emit).toHaveBeenCalledTimes(4);
  });

  it('preserves duplicate-key conflicts and wraps favorite persistence errors', async () => {
    employeeFavorites.findOne.mockResolvedValue(null);
    employeeFavorites.save.mockRejectedValueOnce({ code: '23505' });
    const duplicate = (await service
      .employeeFavoriteCompany({ eid: 'employee-1', cid: 'company-1' })
      .catch((value) => value)) as RpcException;
    expect(duplicate.getError()).toEqual({
      statusCode: 400,
      message: 'Already favorited',
    });

    companyFavorites.findOne.mockRejectedValueOnce(
      new Error('database failed'),
    );
    const failed = (await service
      .companyFavoriteEmployee({ cid: 'company-1', eid: 'employee-1' })
      .catch((value) => value)) as RpcException;
    expect(failed.getError()).toEqual({
      statusCode: 500,
      message: 'database failed',
    });
  });

  it('lists employee favorites from cache, empty storage, and populated storage', async () => {
    const cached = [{ id: 'cached' }];
    redis.get.mockResolvedValueOnce(cached);
    await expect(
      service.findAllEmployeeFavorites({ eid: 'employee-1' }),
    ).resolves.toBe(cached);

    redis.get.mockResolvedValueOnce(null);
    employeeFavorites.find.mockResolvedValueOnce([]);
    await expect(
      service.findAllEmployeeFavorites({ eid: 'employee-1' }),
    ).resolves.toEqual([]);

    redis.get.mockResolvedValueOnce(null);
    employeeFavorites.find.mockResolvedValueOnce([
      {
        id: 'favorite-1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        company: { id: 'company-1', user: { id: 'user-2' }, openPositions: [] },
      },
    ]);
    const result = await service.findAllEmployeeFavorites({
      eid: 'employee-1',
    });
    expect(result[0]).toEqual(
      expect.objectContaining({ id: 'favorite-1', userId: 'user-2' }),
    );
  });

  it('lists company favorites from cache, empty storage, and populated storage', async () => {
    redis.get.mockResolvedValueOnce([{ id: 'cached' }]);
    await expect(
      service.findAllCompanyFavorites({ cid: 'company-1' }),
    ).resolves.toEqual([{ id: 'cached' }]);

    redis.get.mockResolvedValueOnce(null);
    companyFavorites.find.mockResolvedValueOnce([]);
    await expect(
      service.findAllCompanyFavorites({ cid: 'company-1' }),
    ).resolves.toEqual([]);

    redis.get.mockResolvedValueOnce(null);
    companyFavorites.find.mockResolvedValueOnce([
      {
        id: 'favorite-1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        employee: { id: 'employee-1', user: { id: 'user-1' }, skills: [] },
      },
    ]);
    const result = await service.findAllCompanyFavorites({ cid: 'company-1' });
    expect(result[0]).toEqual(
      expect.objectContaining({ id: 'favorite-1', userId: 'user-1' }),
    );
  });

  it('loads career scopes, honors their cache, and preserves a missing-scopes 404', async () => {
    redis.get.mockResolvedValueOnce([{ id: 'scope-cached', name: 'Cached' }]);
    await expect(service.findAllCareerScopes()).resolves.toEqual([
      expect.objectContaining({ id: 'scope-cached' }),
    ]);

    redis.get.mockResolvedValueOnce(null);
    scopes.find.mockResolvedValueOnce([{ id: 'scope-1', name: 'Engineering' }]);
    await expect(service.findAllCareerScopes()).resolves.toEqual([
      expect.objectContaining({ id: 'scope-1' }),
    ]);

    redis.get.mockResolvedValueOnce(null);
    scopes.find.mockResolvedValueOnce([]);
    const error = (await service
      .findAllCareerScopes()
      .catch((value) => value)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 404,
      message: 'No career scopes available',
    });
  });

  it('counts employee and company favorites with cache support', async () => {
    companyFavorites.count.mockResolvedValue(3);
    employeeFavorites.count.mockResolvedValue(4);
    await expect(
      service.countCompanyFavorite({ cid: 'company-1' }),
    ).resolves.toEqual(expect.objectContaining({ count: 3 }));
    await expect(
      service.countEmployeeFavorite({ eid: 'employee-1' }),
    ).resolves.toEqual(expect.objectContaining({ count: 4 }));

    redis.get
      .mockResolvedValueOnce({ count: 8 })
      .mockResolvedValueOnce({ count: 9 });
    await expect(
      service.countCompanyFavorite({ cid: 'company-1' }),
    ).resolves.toEqual({ count: 8 });
    await expect(
      service.countEmployeeFavorite({ eid: 'employee-1' }),
    ).resolves.toEqual({ count: 9 });
  });

  it('clears every current-user cache namespace', async () => {
    await service.clearCurrentUserCache({ userId: 'user-1' });
    expect(redis.del).toHaveBeenCalledTimes(3);
    expect(redis.generateUserKey).toHaveBeenCalledWith('detail', 'user-1');
    expect(redis.generateUserKey).toHaveBeenCalledWith('profile', 'user-1');
    expect(redis.generateUserKey).toHaveBeenCalledWith('settings', 'user-1');
  });

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

  it('treats cache warming failure as non-fatal', async () => {
    jest
      .spyOn(service, 'findAllCareerScopes')
      .mockRejectedValue(new Error('Redis down'));
    jest.spyOn(service, 'findAllUsers').mockResolvedValue([]);
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Redis down'),
    );
  });

  it('wraps empty and failed user-list queries without leaking internals', async () => {
    users.createQueryBuilder.mockReturnValueOnce(queryBuilder([]));
    const empty = (await service
      .findAllUsers({})
      .catch((error) => error)) as RpcException;
    expect(empty.getError()).toEqual({
      statusCode: 500,
      message: 'There are no users available',
    });

    users.createQueryBuilder.mockImplementationOnce(() => {
      throw 'unexpected failure';
    });
    const malformed = (await service
      .findAllUsers({})
      .catch((error) => error)) as RpcException;
    expect(malformed.getError()).toEqual({
      statusCode: 500,
      message: 'An error occurred while finding all the users.',
    });
  });

  it('wraps push-token storage errors including non-Error failures', async () => {
    users.update.mockRejectedValueOnce(new Error('update failed'));
    const failed = (await service
      .updatePushNotificationToken({ userId: 'user-1', token: 'token' })
      .catch((error) => error)) as RpcException;
    expect(failed.getError()).toEqual({
      statusCode: 500,
      message: 'update failed',
    });

    users.update.mockRejectedValueOnce('unknown');
    const unknown = (await service
      .updatePushNotificationToken({ userId: 'user-1', token: 'token' })
      .catch((error) => error)) as RpcException;
    expect(unknown.getError()).toEqual({
      statusCode: 500,
      message: 'Unknown error',
    });
  });

  it('preserves company duplicate favorites and wraps both unfavorite failures', async () => {
    companyFavorites.findOne.mockResolvedValueOnce({ id: 'existing' });
    const duplicate = (await service
      .companyFavoriteEmployee({ cid: 'company-1', eid: 'employee-1' })
      .catch((error) => error)) as RpcException;
    expect(duplicate.getError()).toEqual({
      statusCode: 400,
      message: 'Already favorited',
    });

    employeeFavorites.findOne.mockResolvedValueOnce({ id: 'ef-1' });
    employeeFavorites.remove.mockRejectedValueOnce(
      new Error('employee remove failed'),
    );
    const employeeRemove = (await service
      .employeeUnfavoriteCompany({
        eid: 'employee-1',
        cid: 'company-1',
        favoriteId: 'ef-1',
      })
      .catch((error) => error)) as RpcException;
    expect(employeeRemove.getError()).toEqual({
      statusCode: 500,
      message: 'employee remove failed',
    });

    companyFavorites.findOne.mockResolvedValueOnce({ id: 'cf-1' });
    companyFavorites.remove.mockRejectedValueOnce(
      new Error('company remove failed'),
    );
    const companyRemove = (await service
      .companyUnfavoriteEmployee({
        cid: 'company-1',
        eid: 'employee-1',
        favoriteId: 'cf-1',
      })
      .catch((error) => error)) as RpcException;
    expect(companyRemove.getError()).toEqual({
      statusCode: 500,
      message: 'company remove failed',
    });
  });

  it('wraps favorite list, scope, and count database failures', async () => {
    employeeFavorites.find.mockRejectedValueOnce(
      new Error('employee list failed'),
    );
    const employeeList = (await service
      .findAllEmployeeFavorites({ eid: 'employee-1' })
      .catch((error) => error)) as RpcException;
    expect(employeeList.getError()).toEqual({
      statusCode: 500,
      message: 'employee list failed',
    });

    companyFavorites.find.mockRejectedValueOnce(
      new Error('company list failed'),
    );
    const companyList = (await service
      .findAllCompanyFavorites({ cid: 'company-1' })
      .catch((error) => error)) as RpcException;
    expect(companyList.getError()).toEqual({
      statusCode: 500,
      message: 'company list failed',
    });

    scopes.find.mockRejectedValueOnce(new Error('scope list failed'));
    const scopeList = (await service
      .findAllCareerScopes()
      .catch((error) => error)) as RpcException;
    expect(scopeList.getError()).toEqual({
      statusCode: 500,
      message: 'scope list failed',
    });

    companyFavorites.count.mockRejectedValueOnce(
      new Error('company count failed'),
    );
    const companyCount = (await service
      .countCompanyFavorite({ cid: 'company-1' })
      .catch((error) => error)) as RpcException;
    expect(companyCount.getError()).toEqual({
      statusCode: 500,
      message: 'company count failed',
    });

    employeeFavorites.count.mockRejectedValueOnce(
      new Error('employee count failed'),
    );
    const employeeCount = (await service
      .countEmployeeFavorite({ eid: 'employee-1' })
      .catch((error) => error)) as RpcException;
    expect(employeeCount.getError()).toEqual({
      statusCode: 500,
      message: 'employee count failed',
    });
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
