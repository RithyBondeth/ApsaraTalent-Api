import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { JobService } from './job-service.service';
import { generateJobListKey } from '@app/common/redis/redis-keys.util';

describe('JobService', () => {
  const repository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const logger = { setContext: jest.fn(), info: jest.fn(), error: jest.fn() };
  const redis = {
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

    await expect(service.findAllJobs({ skip: 20, limit: 10 })).resolves.toEqual(
      [expect.objectContaining({ id: 'job-1' })],
    );
    expect(redis.get).toHaveBeenCalledWith(
      `${generateJobListKey()}:skip:20:limit:10`,
    );
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('restores the derived fields a cached job page lost to JSON', async () => {
    // Redis returns plain objects: the @Expose() getters did not survive
    // JSON.stringify, only the columns they read. A hit must still answer
    // with `skills`, or the search card crashes on `skills.length`.
    redis.get.mockResolvedValue([
      {
        id: 'job-1',
        title: 'Engineer',
        skillsRequired: 'Node.js, Redis',
        experienceRequired: '3 - 5 years',
        educationRequired: "Bachelor's Degree",
      },
    ]);

    const [job] = await service.findAllJobs({});
    expect(job.skills).toEqual(['Node.js', 'Redis']);
    expect(job.experience).toBe('3 - 5 years');
    expect(job.education).toBe("Bachelor's Degree");
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
      `${generateJobListKey()}:skip:0:limit:20`,
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
      'addSelect',
      'setParameters',
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

    await expect(service.searchJobs({})).resolves.toEqual(
      expect.objectContaining({ total: 0, page: 1, pageSize: 20, data: [] }),
    );
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('restores the derived fields a cached search lost to JSON', async () => {
    redis.get.mockResolvedValue({
      data: [
        {
          id: 'job-1',
          title: 'Engineer',
          skillsRequired: 'Node.js, Redis',
          experienceRequired: '3 - 5 years',
          educationRequired: "Bachelor's Degree",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const { data, total } = await service.searchJobs({});
    expect(total).toBe(1);
    expect(data[0].skills).toEqual(['Node.js', 'Redis']);
    expect(data[0].experience).toBe('3 - 5 years');
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

  it('applies every supported search filter and safe sort fallback', async () => {
    redis.get.mockResolvedValue(null);
    const qb = queryBuilder([[], 0]);
    repository.createQueryBuilder.mockReturnValue(qb);
    await service.searchJobs({
      companySizeMin: 10,
      companySizeMax: 500,
      postedDateFrom: '2026-01-01',
      postedDateTo: '2026-12-31',
      salaryMin: 1000,
      salaryMax: 3000,
      jobType: ['Full-time', 'Remote'],
      experienceLevel: 'Senior',
      educationRequired: ['Bachelor', 'Master'],
      sortBy: 'companySize',
      sortOrder: 'sideways' as any,
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      'company.companySize BETWEEN :csMin AND :csMax',
      { csMin: 10, csMax: 500 },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'job.createdAt BETWEEN :from AND :to',
      expect.objectContaining({ from: expect.any(Date), to: expect.any(Date) }),
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('job."salaryMin" IS NULL'),
      { salaryMin: 1000, salaryMax: 3000 },
    );
    // 'Senior' carries no number, so it is not a filterable experience level
    // and must not narrow the results at all.
    expect(qb.andWhere).not.toHaveBeenCalledWith(
      expect.stringContaining('experienceRequired'),
      expect.anything(),
    );
    expect(qb.orderBy).toHaveBeenCalledWith('company.companySize', 'DESC');

    const brackets = qb.andWhere.mock.calls
      .map(([value]) => value)
      .filter((value) => value && typeof value.whereFactory === 'function');
    expect(brackets).toHaveLength(2);
    const inner = { where: jest.fn(), orWhere: jest.fn() };
    brackets.forEach((value) => value.whereFactory(inner));
    expect(inner.where).toHaveBeenCalledTimes(2);
    expect(inner.orWhere).toHaveBeenCalledTimes(2);
  });

  it('ranks by keyword relevance, not post date, when a keyword is given', async () => {
    redis.get.mockResolvedValue(null);
    const qb = queryBuilder([[], 0]);
    repository.createQueryBuilder.mockReturnValue(qb);

    await service.searchJobs({ keyword: 'React' });

    // Title outranks skills outranks description.
    const [scoreSql, alias] = qb.addSelect.mock.calls[0];
    expect(scoreSql).toContain('job.title ILIKE :relevanceExact THEN 100');
    expect(scoreSql).toContain(
      'job."skillsRequired" ILIKE :relevanceLike THEN 10',
    );
    expect(scoreSql).toContain('job.description ILIKE :relevanceLike THEN 4');
    expect(alias).toBe('relevance_score');

    expect(qb.setParameters).toHaveBeenCalledWith(
      expect.objectContaining({
        relevanceExact: 'React',
        relevancePrefix: 'React%',
        relevanceLike: '%React%',
      }),
    );
    expect(qb.orderBy).toHaveBeenCalledWith('relevance_score', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('job.createdAt', 'DESC');
    // Stable tiebreak so pages never repeat or skip a row.
    expect(qb.addOrderBy).toHaveBeenCalledWith('job.id', 'ASC');
  });

  it('reaches the skills a job asks for, not just title and description', async () => {
    redis.get.mockResolvedValue(null);
    const qb = queryBuilder([[], 0]);
    repository.createQueryBuilder.mockReturnValue(qb);

    await service.searchJobs({ keyword: 'React' });

    const keywordClause = qb.andWhere.mock.calls
      .map(([clause]) => clause)
      .find(
        (clause) =>
          typeof clause === 'string' && clause.includes('job.title ILIKE'),
      );
    expect(keywordClause).toContain('job."skillsRequired" ILIKE :keyword');
    expect(keywordClause).toContain('job_skills_skill');
  });

  it('filters on work mode and prefers the job location over the company address', async () => {
    redis.get.mockResolvedValue(null);
    const qb = queryBuilder([[], 0]);
    repository.createQueryBuilder.mockReturnValue(qb);

    await service.searchJobs({
      location: 'Phnom Penh',
      workMode: 'remote' as any,
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('job.location ILIKE :location'),
      { location: '%Phnom Penh%' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('job."workMode" = :workMode', {
      workMode: 'remote',
    });
  });

  it('uses open-ended defaults for partial size, date, and salary filters', async () => {
    redis.get.mockResolvedValue(null);
    const qb = queryBuilder([[], 0]);
    repository.createQueryBuilder.mockReturnValue(qb);
    await service.searchJobs({
      companySizeMax: 20,
      postedDateTo: '2026-12-31',
      salaryMax: 2500,
      sortBy: 'invalid',
      sortOrder: 'ASC',
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      'company.companySize BETWEEN :csMin AND :csMax',
      { csMin: 0, csMax: 20 },
    );
    expect(qb.orderBy).toHaveBeenCalledWith('job.createdAt', 'ASC');
    expect(qb.addSelect).not.toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('job."salaryMin" IS NULL'),
      { salaryMin: 0, salaryMax: 2500 },
    );
  });

  it('uses a stable fallback message for malformed database failures', async () => {
    redis.get.mockResolvedValue(null);
    repository.createQueryBuilder.mockImplementationOnce(() => {
      throw 'database failure';
    });
    const error = (await service
      .searchJobs({})
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({ statusCode: 500, message: undefined });
    expect(logger.error).toHaveBeenCalledWith(
      'An error occurred while searching for jobs',
    );
  });
});
