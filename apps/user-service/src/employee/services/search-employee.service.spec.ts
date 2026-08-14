import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { SearchEmployeeService } from './search-employee.service';

describe('SearchEmployeeService', () => {
  const repository = { createQueryBuilder: jest.fn() };
  const logger = { info: jest.fn(), error: jest.fn() };
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
  };
  const service = new SearchEmployeeService(
    repository as any,
    logger as any,
    redis as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
  });

  function queryBuilder(result: [any[], number]) {
    const qb: Record<string, jest.Mock> = {};
    for (const method of [
      'leftJoinAndSelect',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ]) {
      qb[method] = jest.fn(() => qb);
    }
    qb.getManyAndCount = jest.fn().mockResolvedValue(result);
    return qb;
  }

  it('returns cached searches without a database query', async () => {
    const cached = { data: [], total: 0, page: 1, pageSize: 20 };
    redis.get.mockResolvedValue(cached);
    await expect(service.searchEmployee({} as any)).resolves.toBe(cached);
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('builds filters, blocking visibility, sorting, and pagination', async () => {
    const qb = queryBuilder([
      [{ id: 'employee-1', firstname: 'Sok', user: { id: 'user-1' } }],
      1,
    ]);
    repository.createQueryBuilder.mockReturnValue(qb);
    const result = await service.searchEmployee({
      keyword: 'engineer',
      location: 'Phnom Penh',
      jobType: 'Full Time',
      requesterId: 'requester',
      page: 2,
      pageSize: 5,
      sortBy: 'firstname',
      sortOrder: 'ASC',
    } as any);
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(qb.orderBy).toHaveBeenCalledWith('employee.firstname', 'ASC');
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('NOT EXISTS'),
      { requesterId: 'requester' },
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({ userId: 'user-1' }),
    );
    expect(redis.set).toHaveBeenCalled();
  });

  it('bypasses cache for per-user employee exclusions', async () => {
    const qb = queryBuilder([[], 0]);
    repository.createQueryBuilder.mockReturnValue(qb);
    await service.searchEmployee({
      excludeEmployeeIds: ['employee-1'],
    } as any);
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalledWith(
      'employee.id NOT IN (:...excludeEmployeeIds)',
      { excludeEmployeeIds: ['employee-1'] },
    );
  });

  it('falls back to an unscoped first page when semantic matching is empty', async () => {
    const scoped = queryBuilder([[], 0]);
    const fallback = queryBuilder([
      [{ id: 'employee-1', user: { id: 'user-1' } }],
      1,
    ]);
    repository.createQueryBuilder
      .mockReturnValueOnce(scoped)
      .mockReturnValueOnce(fallback);
    const result = await service.searchEmployee({
      careerScopes: ['Software'],
      page: 1,
    } as any);
    expect(result.isUsingFallback).toBe(true);
    expect(result.total).toBe(1);
  });

  it('does not use fallback on later pages', async () => {
    repository.createQueryBuilder.mockReturnValue(queryBuilder([[], 0]));
    const result = await service.searchEmployee({
      careerScopes: ['Software'],
      page: 2,
    } as any);
    expect(repository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(result.isUsingFallback).toBe(false);
  });

  it('wraps database failures as internal RPC errors', async () => {
    repository.createQueryBuilder.mockImplementation(() => {
      throw new Error('database unavailable');
    });
    const error = (await service
      .searchEmployee({} as any)
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 500,
      message: 'database unavailable',
    });
  });

  it('builds education, experience, scope, and experience-order filters', async () => {
    const qb = queryBuilder([[{ id: 'employee-1', user: undefined }], 1]);
    repository.createQueryBuilder.mockReturnValue(qb);

    const result = await service.searchEmployee({
      experienceLevel: '3 - 5 years',
      education: ['Bachelor', 'Master'],
      careerScopes: ['Engineering'],
      sortBy: 'yearsOfExperience',
      sortOrder: 'desc',
    } as any);

    expect(qb.andWhere).toHaveBeenCalledWith(
      'employee.yearsOfExperience = :experienceLevel',
      { experienceLevel: '3 - 5 years' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('cs_candidate.embedding'),
      expect.objectContaining({ searchScopes: ['Engineering'] }),
    );
    expect(qb.orderBy).toHaveBeenCalledWith(
      expect.stringContaining('No Experience'),
      'DESC',
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({ userId: undefined }),
    );

    const brackets = qb.andWhere.mock.calls
      .map(([condition]) => condition)
      .find((condition) => condition?.whereFactory);
    const expression = {
      where: jest.fn(),
      orWhere: jest.fn(),
    };
    brackets.whereFactory(expression);
    expect(expression.where).toHaveBeenCalledWith(
      'edu.degree ILIKE :degree_0',
      { degree_0: '%Bachelor%' },
    );
    expect(expression.orWhere).toHaveBeenCalledWith(
      'edu.degree ILIKE :degree_1',
      { degree_1: '%Master%' },
    );
  });

  it.each(['All', ''])(
    'does not add an experience filter for the %j sentinel',
    async (experienceLevel) => {
      const qb = queryBuilder([[], 0]);
      repository.createQueryBuilder.mockReturnValue(qb);
      await service.searchEmployee({ experienceLevel } as any);
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'employee.yearsOfExperience = :experienceLevel',
        expect.anything(),
      );
    },
  );

  it('preserves RPC errors and uses a defensive message for non-Error failures', async () => {
    const rpc = new RpcException({ statusCode: 409, message: 'conflict' });
    repository.createQueryBuilder.mockImplementationOnce(() => {
      throw rpc;
    });
    await expect(service.searchEmployee({} as any)).rejects.toBe(rpc);

    repository.createQueryBuilder.mockImplementationOnce(() => {
      throw null;
    });
    const failure = (await service
      .searchEmployee({} as any)
      .catch((caught) => caught)) as RpcException;
    expect(failure.getError()).toEqual({
      statusCode: 500,
      message: 'An error occurred while searching for employees.',
    });
  });

  it('wraps cache write failures after a successful database search', async () => {
    repository.createQueryBuilder.mockReturnValue(queryBuilder([[], 0]));
    redis.set.mockRejectedValueOnce(new Error('cache unavailable'));

    const failure = (await service
      .searchEmployee({} as any)
      .catch((caught) => caught)) as RpcException;

    expect(failure.getError()).toEqual({
      statusCode: 500,
      message: 'cache unavailable',
    });
  });
});
