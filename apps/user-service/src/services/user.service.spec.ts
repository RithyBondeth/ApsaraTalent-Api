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

  const service = new UserService(
    users as any,
    scopes as any,
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

  it('clears every current-user cache namespace', async () => {
    await service.clearCurrentUserCache({ userId: 'user-1' });
    expect(redis.del).toHaveBeenCalledTimes(3);
    expect(redis.generateUserKey).toHaveBeenCalledWith('detail', 'user-1');
    expect(redis.generateUserKey).toHaveBeenCalledWith('profile', 'user-1');
    expect(redis.generateUserKey).toHaveBeenCalledWith('settings', 'user-1');
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

  it('wraps career scope database failures', async () => {
    scopes.find.mockRejectedValueOnce(new Error('scope list failed'));
    const scopeList = (await service
      .findAllCareerScopes()
      .catch((error) => error)) as RpcException;
    expect(scopeList.getError()).toEqual({
      statusCode: 500,
      message: 'scope list failed',
    });
  });
});
