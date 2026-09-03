import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { JobService } from './job-service.service';
import {
  generateJobListKey,
  generatePublicJobKey,
} from '@app/common/redis/redis-keys.util';
import { EUserStatus } from '@app/common/database/enums/user-status.enum';

describe('JobService', () => {
  const repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
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
    const qb = queryBuilder([
      [{ id: 'job-1', title: 'Engineer', company: { id: 'company-1' } }],
      1,
    ]);
    repository.createQueryBuilder.mockReturnValue(qb);

    const result = await service.findAllJobs({ skip: 0, limit: 20 });

    expect(result).toHaveLength(1);
    // Filters both the expiry clause and the active-account clause. Doing them
    // in one query means the find() `where` array's OR shape no longer fits.
    expect(qb.where).toHaveBeenCalledWith(
      expect.stringContaining('expireDate'),
      expect.any(Object),
    );
    const andWhereSql = qb.andWhere.mock.calls.flat().join(' ');
    expect(andWhereSql).toMatch(/status/);
    // Suspended-and-expired must be re-admitted at read time; without this,
    // an account is invisible for hours after its suspension expired.
    expect(andWhereSql).toMatch(/suspendedUntil/);
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(20);
    expect(redis.set).toHaveBeenCalledWith(
      `${generateJobListKey()}:skip:0:limit:20`,
      result,
      expect.any(Number),
    );
  });

  it('wraps job-list database failures', async () => {
    redis.get.mockResolvedValue(null);
    const qb = queryBuilder([[], 0]);
    qb.getMany = jest.fn().mockRejectedValue(new Error('database unavailable'));
    repository.createQueryBuilder.mockReturnValue(qb);
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
    qb.getMany = jest.fn().mockResolvedValue(result[0]);
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

  describe('findOneJob', () => {
    const activeCompany = {
      id: 'company-1',
      name: 'Acme',
      avatar: 'avatar.png',
      industry: 'Software',
      location: 'Phnom Penh',
      companySize: 40,
      user: { id: 'user-1', status: EUserStatus.ACTIVE },
    };

    const row = (overrides: Record<string, unknown> = {}) => ({
      id: 'job-1',
      title: 'Backend Engineer',
      description: 'Build things',
      type: 'full_time',
      experienceRequired: '3 - 5 years',
      educationRequired: "Bachelor's Degree",
      skillsRequired: 'Node.js, Redis',
      requiredSkills: [{ name: 'Node.js' }, { name: 'Redis' }],
      salary: '$2000',
      salaryMin: '2000.00',
      salaryMax: '3000.00',
      salaryCurrency: 'USD',
      workMode: 'remote',
      location: 'Phnom Penh',
      languagesRequired: ['English'],
      openingsCount: 2,
      expireDate: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      company: activeCompany,
      ...overrides,
    });

    it('returns a public job and caches it', async () => {
      redis.get.mockResolvedValue(null);
      repository.findOne.mockResolvedValue(row());

      const job = await service.findOneJob({ jobId: 'job-1' });

      expect(job).toMatchObject({
        id: 'job-1',
        title: 'Backend Engineer',
        skills: ['Node.js', 'Redis'],
        createdAt: '2026-08-01T00:00:00.000Z',
        company: { id: 'company-1', name: 'Acme' },
      });
      expect(redis.set).toHaveBeenCalledWith(
        generatePublicJobKey('job-1'),
        expect.anything(),
        expect.any(Number),
      );
    });

    it('never exposes the company user relation', async () => {
      redis.get.mockResolvedValue(null);
      repository.findOne.mockResolvedValue(row());

      const job = await service.findOneJob({ jobId: 'job-1' });

      // The authenticated DTO carries a `user` with twenty-odd @Exclude()
      // fields. This one is served without a session, so it has no user at all.
      expect((job as any)?.company).not.toHaveProperty('user');
      expect(JSON.stringify(job)).not.toContain('user-1');
    });

    it('coerces the decimal salary columns pg returns as strings', async () => {
      redis.get.mockResolvedValue(null);
      repository.findOne.mockResolvedValue(row());

      const job = await service.findOneJob({ jobId: 'job-1' });

      // JSON-LD and the salary range both need numbers.
      expect(job?.salaryMin).toBe(2000);
      expect(job?.salaryMax).toBe(3000);
    });

    it('serves a cache hit without rebuilding the DTO', async () => {
      redis.get.mockResolvedValue({ id: 'job-1', skills: ['Node.js'] });

      const job = await service.findOneJob({ jobId: 'job-1' });

      // Plain properties, so a hit and a miss are the same object — no getter
      // reconstruction step to forget.
      expect(job).toEqual({ id: 'job-1', skills: ['Node.js'] });
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it('returns null for a job that does not exist', async () => {
      redis.get.mockResolvedValue(null);
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findOneJob({ jobId: 'missing' }),
      ).resolves.toBeNull();
    });

    it.each([EUserStatus.SUSPENDED, EUserStatus.BANNED])(
      'refuses to serve a posting from a %s account',
      async (status) => {
        redis.get.mockResolvedValue(null);
        repository.findOne.mockResolvedValue(
          row({ company: { ...activeCompany, user: { id: 'u', status } } }),
        );

        // Anonymous means crawlable, and a crawled scam posting outlives the
        // ban that was supposed to remove it.
        await expect(
          service.findOneJob({ jobId: 'job-1' }),
        ).resolves.toBeNull();
        expect(redis.set).not.toHaveBeenCalled();
      },
    );

    it('serves a posting whose suspension has already expired', async () => {
      redis.get.mockResolvedValue(null);
      repository.findOne.mockResolvedValue(
        row({
          company: {
            ...activeCompany,
            user: {
              id: 'u',
              status: EUserStatus.SUSPENDED,
              suspendedUntil: new Date(Date.now() - 86_400_000),
            },
          },
        }),
      );

      await expect(
        service.findOneJob({ jobId: 'job-1' }),
      ).resolves.not.toBeNull();
    });

    it('refuses a posting with no owning account at all', async () => {
      redis.get.mockResolvedValue(null);
      repository.findOne.mockResolvedValue(row({ company: { id: 'c' } }));

      await expect(service.findOneJob({ jobId: 'job-1' })).resolves.toBeNull();
    });

    it('reports a database failure as an internal RPC error', async () => {
      redis.get.mockResolvedValue(null);
      repository.findOne.mockRejectedValue(new Error('database unavailable'));

      await expectInternalError(service.findOneJob({ jobId: 'job-1' }));
    });
  });

  describe('findPublicJobSitemap', () => {
    it('returns ids and timestamps only', async () => {
      redis.get.mockResolvedValue(null);
      repository.find.mockResolvedValue([
        { id: 'job-1', createdAt: new Date('2026-08-01T00:00:00.000Z') },
      ]);

      await expect(service.findPublicJobSitemap()).resolves.toEqual([
        { id: 'job-1', updatedAt: '2026-08-01T00:00:00.000Z' },
      ]);
      expect(redis.set).toHaveBeenCalled();
    });

    it('warns when the entry cap is reached', async () => {
      redis.get.mockResolvedValue(null);
      repository.find.mockResolvedValue(
        Array.from({ length: 45_000 }, (_, index) => ({
          id: `job-${index}`,
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
        })),
      );

      await service.findPublicJobSitemap();

      // Silently truncating would drop postings out of the index with nothing
      // anywhere saying so.
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('45000-entry cap'),
      );
    });

    it('reports a database failure as an internal RPC error', async () => {
      redis.get.mockResolvedValue(null);
      repository.find.mockRejectedValue(new Error('database unavailable'));

      await expectInternalError(service.findPublicJobSitemap());
    });
  });
});
