import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { FavoritesService } from './favorites.service';
import { FavoritesQueryService } from './favorites-query.service';

describe('FavoritesService', () => {
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
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clearUserDetailCache: jest.fn(),
  };
  const events = { emit: jest.fn() };

  const service = new FavoritesService(
    employeeFavorites as any,
    companyFavorites as any,
    logger as any,
    redis as any,
    events as any,
  );

  // Read-side methods moved to FavoritesQueryService; same repositories, logger
  // and cache fixtures, so the behaviour under test is unchanged.
  const queryService = new FavoritesQueryService(
    employeeFavorites as any,
    companyFavorites as any,
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

  async function expectRpc(
    promise: Promise<unknown>,
    statusCode: number,
    message: string,
  ) {
    const error = (await promise.catch((caught) => caught)) as RpcException;
    expect(error).toBeInstanceOf(RpcException);
    expect(error.getError()).toEqual({ statusCode, message });
  }

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

  it('prevents removal of a missing company favorite', async () => {
    companyFavorites.findOne.mockResolvedValue(null);
    const error = (await service
      .companyUnfavoriteEmployee({
        cid: 'company-1',
        eid: 'employee-1',
        favoriteId: 'missing',
      })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual(
      expect.objectContaining({ statusCode: 404 }),
    );
    expect(companyFavorites.remove).not.toHaveBeenCalled();
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
      queryService.findAllEmployeeFavorites({ eid: 'employee-1' }),
    ).resolves.toBe(cached);

    redis.get.mockResolvedValueOnce(null);
    employeeFavorites.find.mockResolvedValueOnce([]);
    await expect(
      queryService.findAllEmployeeFavorites({ eid: 'employee-1' }),
    ).resolves.toEqual([]);

    redis.get.mockResolvedValueOnce(null);
    employeeFavorites.find.mockResolvedValueOnce([
      {
        id: 'favorite-1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        company: {
          id: 'company-1',
          user: { id: 'user-2' },
          openPositions: [{ id: 'job-1', skillsRequired: '' }],
        },
      },
    ]);
    const result = await queryService.findAllEmployeeFavorites({
      eid: 'employee-1',
    });
    expect(result[0]).toEqual(
      expect.objectContaining({ id: 'favorite-1', userId: 'user-2' }),
    );
  });

  it('lists company favorites from cache, empty storage, and populated storage', async () => {
    redis.get.mockResolvedValueOnce([{ id: 'cached' }]);
    await expect(
      queryService.findAllCompanyFavorites({ cid: 'company-1' }),
    ).resolves.toEqual([{ id: 'cached' }]);

    redis.get.mockResolvedValueOnce(null);
    companyFavorites.find.mockResolvedValueOnce([]);
    await expect(
      queryService.findAllCompanyFavorites({ cid: 'company-1' }),
    ).resolves.toEqual([]);

    redis.get.mockResolvedValueOnce(null);
    companyFavorites.find.mockResolvedValueOnce([
      {
        id: 'favorite-1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        employee: { id: 'employee-1', user: { id: 'user-1' }, skills: [] },
      },
    ]);
    const result = await queryService.findAllCompanyFavorites({
      cid: 'company-1',
    });
    expect(result[0]).toEqual(
      expect.objectContaining({ id: 'favorite-1', userId: 'user-1' }),
    );
  });

  it('counts employee and company favorites with cache support', async () => {
    companyFavorites.count.mockResolvedValue(3);
    employeeFavorites.count.mockResolvedValue(4);
    await expect(
      queryService.countCompanyFavorite({ cid: 'company-1' }),
    ).resolves.toEqual(expect.objectContaining({ count: 3 }));
    await expect(
      queryService.countEmployeeFavorite({ eid: 'employee-1' }),
    ).resolves.toEqual(expect.objectContaining({ count: 4 }));

    redis.get
      .mockResolvedValueOnce({ count: 8 })
      .mockResolvedValueOnce({ count: 9 });
    await expect(
      queryService.countCompanyFavorite({ cid: 'company-1' }),
    ).resolves.toEqual({ count: 8 });
    await expect(
      queryService.countEmployeeFavorite({ eid: 'employee-1' }),
    ).resolves.toEqual({ count: 9 });
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

  it('wraps favorite list and count database failures', async () => {
    employeeFavorites.find.mockRejectedValueOnce(
      new Error('employee list failed'),
    );
    const employeeList = (await queryService
      .findAllEmployeeFavorites({ eid: 'employee-1' })
      .catch((error) => error)) as RpcException;
    expect(employeeList.getError()).toEqual({
      statusCode: 500,
      message: 'employee list failed',
    });

    companyFavorites.find.mockRejectedValueOnce(
      new Error('company list failed'),
    );
    const companyList = (await queryService
      .findAllCompanyFavorites({ cid: 'company-1' })
      .catch((error) => error)) as RpcException;
    expect(companyList.getError()).toEqual({
      statusCode: 500,
      message: 'company list failed',
    });

    companyFavorites.count.mockRejectedValueOnce(
      new Error('company count failed'),
    );
    const companyCount = (await queryService
      .countCompanyFavorite({ cid: 'company-1' })
      .catch((error) => error)) as RpcException;
    expect(companyCount.getError()).toEqual({
      statusCode: 500,
      message: 'company count failed',
    });

    employeeFavorites.count.mockRejectedValueOnce(
      new Error('employee count failed'),
    );
    const employeeCount = (await queryService
      .countEmployeeFavorite({ eid: 'employee-1' })
      .catch((error) => error)) as RpcException;
    expect(employeeCount.getError()).toEqual({
      statusCode: 500,
      message: 'employee count failed',
    });
  });

  it('normalizes a company duplicate-key race to Already favorited', async () => {
    companyFavorites.findOne.mockResolvedValue(null);
    companyFavorites.save.mockRejectedValueOnce({ code: '23505' });

    const duplicate = (await service
      .companyFavoriteEmployee({ cid: 'company-1', eid: 'employee-1' })
      .catch((error) => error)) as RpcException;

    expect(duplicate.getError()).toEqual({
      statusCode: 400,
      message: 'Already favorited',
    });
  });

  it('wraps cache invalidation failures without emitting update events', async () => {
    employeeFavorites.findOne.mockResolvedValue(null);
    employeeFavorites.save.mockResolvedValue({ id: 'favorite-1' });
    redis.del.mockRejectedValueOnce(new Error('cache delete failed'));

    const failure = (await service
      .employeeFavoriteCompany({ eid: 'employee-1', cid: 'company-1' })
      .catch((error) => error)) as RpcException;

    expect(failure.getError()).toEqual({
      statusCode: 500,
      message: 'cache delete failed',
    });
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('omits a missing nested relation instead of emitting an empty object', async () => {
    // A favorite whose related profile is gone must not serialize as `{}`:
    // that is truthy, so any `if (favorite.company)` check on the client would
    // treat a deleted company as a live one.
    employeeFavorites.find.mockResolvedValueOnce([
      {
        id: 'employee-favorite',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        company: undefined,
      },
    ]);
    await expect(
      queryService.findAllEmployeeFavorites({ eid: 'employee-1' }),
    ).resolves.toEqual([
      expect.objectContaining({ userId: '', company: undefined }),
    ]);

    companyFavorites.find.mockResolvedValueOnce([
      {
        id: 'company-favorite',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        employee: undefined,
      },
    ]);
    await expect(
      queryService.findAllCompanyFavorites({ cid: 'company-1' }),
    ).resolves.toEqual([
      expect.objectContaining({ userId: '', employee: undefined }),
    ]);
  });

  it('wraps empty non-Error failures with operation-specific messages', async () => {
    companyFavorites.findOne.mockRejectedValueOnce(null);
    const favoriteFailure = (await service
      .companyFavoriteEmployee({ cid: 'company-1', eid: 'employee-1' })
      .catch((error) => error)) as RpcException;
    expect(favoriteFailure.getError()).toEqual({
      statusCode: 500,
      message: 'An error occurred while favoriting employee.',
    });

    companyFavorites.find.mockRejectedValueOnce(null);
    const listFailure = (await queryService
      .findAllCompanyFavorites({ cid: 'company-1' })
      .catch((error) => error)) as RpcException;
    expect(listFailure.getError()).toEqual({
      statusCode: 500,
      message: 'An error occurred while finding company favorites.',
    });
  });

  it('wraps cache population failures from list and count operations', async () => {
    employeeFavorites.find.mockResolvedValueOnce([]);
    redis.set.mockRejectedValueOnce(new Error('cache write failed'));
    const listFailure = (await queryService
      .findAllEmployeeFavorites({ eid: 'employee-1' })
      .catch((error) => error)) as RpcException;
    expect(listFailure.getError()).toEqual({
      statusCode: 500,
      message: 'cache write failed',
    });

    companyFavorites.count.mockResolvedValueOnce(1);
    redis.set.mockRejectedValueOnce(new Error('count cache failed'));
    const countFailure = (await queryService
      .countCompanyFavorite({ cid: 'company-1' })
      .catch((error) => error)) as RpcException;
    expect(countFailure.getError()).toEqual({
      statusCode: 500,
      message: 'count cache failed',
    });
  });

  it('uses operation-specific fallbacks for every remaining null failure', async () => {
    employeeFavorites.findOne.mockRejectedValueOnce(null);
    await expectRpc(
      service.employeeFavoriteCompany({
        eid: 'employee-1',
        cid: 'company-1',
      }),
      500,
      'An error occurred while favoriting company.',
    );

    employeeFavorites.findOne.mockRejectedValueOnce(null);
    await expectRpc(
      service.employeeUnfavoriteCompany({
        eid: 'employee-1',
        cid: 'company-1',
        favoriteId: 'favorite-1',
      }),
      500,
      'An error occurred while unfavoriting company.',
    );

    companyFavorites.findOne.mockRejectedValueOnce(null);
    await expectRpc(
      service.companyUnfavoriteEmployee({
        cid: 'company-1',
        eid: 'employee-1',
        favoriteId: 'favorite-1',
      }),
      500,
      'An error occurred while unfavoriting employee.',
    );

    employeeFavorites.find.mockRejectedValueOnce(null);
    await expectRpc(
      queryService.findAllEmployeeFavorites({ eid: 'employee-1' }),
      500,
      'An error occurred while finding employee favorites.',
    );

    companyFavorites.count.mockRejectedValueOnce(null);
    await expectRpc(
      queryService.countCompanyFavorite({ cid: 'company-1' }),
      500,
      'An error occurred while counting company favorites.',
    );

    employeeFavorites.count.mockRejectedValueOnce(null);
    await expectRpc(
      queryService.countEmployeeFavorite({ eid: 'employee-1' }),
      500,
      'An error occurred while counting employee favorites.',
    );
  });
});
