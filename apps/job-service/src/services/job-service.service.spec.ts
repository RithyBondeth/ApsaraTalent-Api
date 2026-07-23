import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { JobService } from './job-service.service';

describe('JobService', () => {
  const repository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const logger = { setContext: jest.fn(), info: jest.fn(), error: jest.fn() };
  const redis = {
    generateJobListKey: jest.fn(() => 'jobs'),
    generateJobSearchKey: jest.fn(() => 'job-search'),
    get: jest.fn(),
    set: jest.fn(),
  };
  const service = new JobService(
    repository as any,
    logger as any,
    redis as any,
  );

  beforeEach(() => jest.clearAllMocks());

  async function expectInternalError(promise: Promise<unknown>) {
    const error = (await promise.catch((caught) => caught)) as RpcException;
    expect(error).toBeInstanceOf(RpcException);
    expect(error.getError()).toEqual({
      statusCode: 500,
      message: 'database unavailable',
    });
  }

  it('returns a cached job page without querying the database', async () => {
    const cached = [{ id: 'job-1' }];
    redis.get.mockResolvedValue(cached);

    await expect(service.findAllJobs({ skip: 20, limit: 10 })).resolves.toBe(
      cached,
    );
    expect(redis.get).toHaveBeenCalledWith('jobs:skip:20:limit:10');
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('returns and caches active jobs on a cache miss', async () => {
    redis.get.mockResolvedValue(null);
    repository.find.mockResolvedValue([
      { id: 'job-1', title: 'Engineer', company: { id: 'company-1' } },
    ]);

    const result = await service.findAllJobs({ skip: 0, limit: 20 });

    expect(result).toHaveLength(1);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: ['company', 'company.user'],
        skip: 0,
        take: 20,
        order: { createdAt: 'DESC' },
      }),
    );
    expect(redis.set).toHaveBeenCalledWith(
      'jobs:skip:0:limit:20',
      result,
      expect.any(Number),
    );
  });

  it('wraps job-list database failures', async () => {
    redis.get.mockResolvedValue(null);
    repository.find.mockRejectedValue(new Error('database unavailable'));
    await expectInternalError(service.findAllJobs({}));
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

  it('returns a cached search without constructing a query', async () => {
    const cached = { data: [], total: 0, page: 1, pageSize: 20 };
    redis.get.mockResolvedValue(cached);

    await expect(service.searchJobs({})).resolves.toBe(cached);
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('builds, paginates, and caches a normal search', async () => {
    redis.get.mockResolvedValue(null);
    const qb = queryBuilder([
      [{ id: 'job-1', title: 'Engineer', company: { id: 'company-1' } }],
      1,
    ]);
    repository.createQueryBuilder.mockReturnValue(qb);

    const result = await service.searchJobs({
      keyword: 'engineer',
      location: 'Phnom Penh',
      page: 2,
      pageSize: 5,
      sortBy: 'title',
      sortOrder: 'ASC',
      requesterId: 'requester-1',
    });

    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(qb.orderBy).toHaveBeenCalledWith('job.title', 'ASC');
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('NOT EXISTS'),
      { requesterId: 'requester-1' },
    );
    expect(result).toEqual(
      expect.objectContaining({ total: 1, page: 2, pageSize: 5 }),
    );
    expect(redis.set).toHaveBeenCalled();
  });

  it('bypasses both search cache operations for per-user exclusions', async () => {
    const qb = queryBuilder([[], 0]);
    repository.createQueryBuilder.mockReturnValue(qb);

    await service.searchJobs({ excludeCompanyIds: ['company-1'] });

    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalledWith(
      'company.id NOT IN (:...excludeCompanyIds)',
      { excludeCompanyIds: ['company-1'] },
    );
  });

  it('falls back to an unscoped first page when scope matching is empty', async () => {
    redis.get.mockResolvedValue(null);
    const scoped = queryBuilder([[], 0]);
    const fallback = queryBuilder([
      [{ id: 'job-1', title: 'Engineer', company: {} }],
      1,
    ]);
    repository.createQueryBuilder
      .mockReturnValueOnce(scoped)
      .mockReturnValueOnce(fallback);

    const result = await service.searchJobs({
      careerScopes: ['Software'],
      page: 1,
      pageSize: 20,
    });

    expect(repository.createQueryBuilder).toHaveBeenCalledTimes(2);
    expect(result.isUsingFallback).toBe(true);
    expect(result.total).toBe(1);
  });

  it('does not fallback for later pages', async () => {
    redis.get.mockResolvedValue(null);
    const scoped = queryBuilder([[], 0]);
    repository.createQueryBuilder.mockReturnValue(scoped);

    const result = await service.searchJobs({
      careerScopes: ['Software'],
      page: 2,
    });

    expect(repository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(result.isUsingFallback).toBe(false);
  });

  it('wraps search database failures', async () => {
    redis.get.mockResolvedValue(null);
    repository.createQueryBuilder.mockImplementation(() => {
      throw new Error('database unavailable');
    });
    await expectInternalError(service.searchJobs({}));
  });
});
