import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { FindCompanyService } from './find-company.service';
import { generateListKey } from '@app/common/redis/redis-keys.util';
import {
  CompanyResponseDTO,
  JobPositionResponseDTO,
} from '@app/contracts/dtos/user';

describe('FindCompanyService', () => {
  const companies = {
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  function companiesQb(rows: any[], overrides: Record<string, jest.Mock> = {}) {
    const qb: Record<string, jest.Mock> = {};
    for (const method of [
      'leftJoinAndSelect',
      'where',
      'andWhere',
      'orderBy',
      'skip',
      'take',
      'select',
    ]) {
      qb[method] = jest.fn(() => qb);
    }
    qb.getMany = jest.fn().mockResolvedValue(rows);
    Object.assign(qb, overrides);
    return qb;
  }
  const users = { findOne: jest.fn() };
  // getBlockedCounterpartUserIds reads the FK columns through a query builder
  // rather than hydrating blocker/blocked. The previous mock resolved `find()`
  // to rows with those relations populated — a shape TypeORM never actually
  // returns without `relations`, which is why this suite stayed green while the
  // filter silently matched nobody in production.
  const blockRows = jest.fn();
  const blocks = {
    exists: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: blockRows,
    })),
  };
  const logger = { info: jest.fn(), error: jest.fn() };
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
  };
  const service = new FindCompanyService(
    companies as any,
    users as any,
    blocks as any,
    logger as any,
    redis as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    blockRows.mockResolvedValue([]);
  });

  it('returns an unfiltered company list from cache', async () => {
    const cached = [{ id: 'company-1' }];
    redis.get.mockResolvedValue(cached);
    await expect(service.findAll({})).resolves.toBe(cached);
    expect(companies.find).not.toHaveBeenCalled();
  });

  it('caches blocked-filtered results under a key of their own', async () => {
    blockRows.mockResolvedValue([
      { blockerId: 'blocked-user', blockedId: 'requester' },
    ]);
    companies.find.mockResolvedValueOnce([{ id: 'blocked-company' }]);
    companies.createQueryBuilder.mockReturnValue(
      companiesQb([{ id: 'visible', name: 'Visible' }]),
    );
    await service.findAll({ requesterId: 'requester' });

    // Filtered pages used to skip the cache entirely, so anyone who had
    // blocked a company paid the full uncached query on every load. They are
    // cached now, but never under the shared key — that would hide the blocked
    // company from everyone.
    const [readKey] = redis.get.mock.calls[0];
    const [writeKey] = redis.set.mock.calls[0];
    expect(readKey).toBe(writeKey);
    expect(readKey).toContain('exclude');

    const unfilteredKey = generateListKey('company', { skip: 0, limit: 10 });
    expect(readKey).not.toBe(unfilteredKey);
  });

  it('leaves the unfiltered key untouched when nothing is excluded', async () => {
    // Users with no blocks must keep hitting the shared entry, byte-identical
    // to the key that is already live in Redis.
    companies.createQueryBuilder.mockReturnValue(
      companiesQb([{ id: 'visible' }]),
    );
    await service.findAll({ requesterId: 'requester', skip: 0, limit: 10 });

    const [readKey] = redis.get.mock.calls[0];
    expect(readKey).toBe(generateListKey('company', { skip: 0, limit: 10 }));
    expect(readKey).not.toContain('exclude');
  });

  it('hides a company profile blocked in either direction', async () => {
    users.findOne.mockResolvedValue({ id: 'company-user' });
    blocks.exists.mockResolvedValue(true);
    const error = (await service
      .findOneById({ companyId: 'company-1', requesterId: 'requester' })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 404,
      message: 'This profile is not available.',
    });
  });

  it('loads and caches company details with open positions', async () => {
    users.findOne.mockResolvedValue({
      email: 'company@example.com',
      company: {
        id: 'company-1',
        name: 'Apsara',
        openPositions: [{ id: 'job-1', title: 'Engineer' }],
      },
    });
    const result = await service.findOneById({ companyId: 'company-1' });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'company-1',
        email: 'company@example.com',
      }),
    );
    expect(redis.set).toHaveBeenCalled();
  });

  it('counts and caches companies', async () => {
    companies.count.mockResolvedValue(8);
    const result = await service.countAllCompanies();
    expect(result.totalCompanies).toBe(8);
    expect(redis.set).toHaveBeenCalled();
  });

  it('wraps count failures as internal RPC errors', async () => {
    companies.count.mockRejectedValue(new Error('database unavailable'));
    const error = (await service
      .countAllCompanies()
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 500,
      message: 'database unavailable',
    });
  });

  it('wraps list failures and null repository results', async () => {
    companies.createQueryBuilder.mockReturnValueOnce(companiesQb(null as any));
    const empty = (await service
      .findAll({})
      .catch((error) => error)) as RpcException;
    expect(empty.getError()).toEqual({
      statusCode: 500,
      message: 'There are no companies available.',
    });
    const failingQb = companiesQb([]);
    failingQb.getMany = jest.fn().mockRejectedValue(new Error('list failed'));
    companies.createQueryBuilder.mockReturnValueOnce(failingQb);
    const failed = (await service
      .findAll({})
      .catch((error) => error)) as RpcException;
    expect(failed.getError()).toEqual({
      statusCode: 500,
      message: 'list failed',
    });
  });

  it('returns cached counts', async () => {
    redis.get.mockResolvedValueOnce({ totalCompanies: 4 });
    await expect(service.countAllCompanies()).resolves.toEqual({
      totalCompanies: 4,
    });
  });

  // Redis holds whatever JSON.stringify made of the DTO, which drops prototype
  // accessors — so the cached copy carries `experienceRequired` but not the
  // `experience` the API publishes. Returning it raw made a cache hit answer
  // with a different shape than a miss: the derived fields disappeared and the
  // internal column names leaked in their place. The cached value has to be
  // rebuilt into a DTO so the accessors come back.
  it('rebuilds a cached company so derived fields survive the hit', async () => {
    redis.get.mockResolvedValueOnce({
      id: 'company-1',
      openPositions: [
        {
          id: 'job-1',
          title: 'Engineer',
          experienceRequired: '3 - 5 years',
          educationRequired: 'Bachelor',
          skillsRequired: 'TypeScript, React',
        },
      ],
    });

    const result = await service.findOneById({ companyId: 'company-1' });

    expect(result).toBeInstanceOf(CompanyResponseDTO);
    const [position] = result.openPositions ?? [];
    expect(position).toBeInstanceOf(JobPositionResponseDTO);
    expect(position.experience).toBe('3 - 5 years');
    expect(position.education).toBe('Bachelor');
    expect(position.skills).toEqual(['TypeScript', 'React']);
  });

  it('hides a missing target owner and allows the owner without block lookup', async () => {
    users.findOne.mockResolvedValueOnce(null);
    await expect(
      service.findOneById({ companyId: 'company-1', requesterId: 'requester' }),
    ).rejects.toBeInstanceOf(RpcException);
    users.findOne
      .mockResolvedValueOnce({ id: 'requester' })
      .mockResolvedValueOnce({
        email: 'owner@example.com',
        company: { id: 'company-1' },
      });
    await service.findOneById({
      companyId: 'company-1',
      requesterId: 'requester',
    });
    expect(blocks.exists).not.toHaveBeenCalled();
  });

  it('wraps company-detail database failures', async () => {
    users.findOne.mockRejectedValueOnce(new Error('detail failed'));
    const error = (await service
      .findOneById({ companyId: 'company-1' })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 500,
      message: 'detail failed',
    });
  });

  it('applies the active-user filter when building the discovery query', async () => {
    const qb = companiesQb([]);
    companies.createQueryBuilder.mockReturnValue(qb);

    await service.findAll({ skip: 0, limit: 10 });

    const whereCalls = qb.where.mock.calls.flat().join(' ');
    // Suspended and banned companies must not appear in the list. A change
    // that drops this call quietly brings them back.
    expect(whereCalls).toMatch(/status/);
    expect(whereCalls).toMatch(/suspendedUntil/);
  });

  it('collects blocks in both directions and maps visible job positions', async () => {
    blockRows.mockResolvedValue([
      { blockerId: 'requester', blockedId: 'blocked-a' },
      { blockerId: 'blocked-b', blockedId: 'requester' },
    ]);
    companies.find.mockResolvedValueOnce([{ id: 'company-blocked' }]);
    companies.createQueryBuilder.mockReturnValue(
      companiesQb([
        {
          id: 'company-visible',
          openPositions: [{ id: 'job-1', skillsRequired: '' }],
        },
      ]),
    );

    const result = await service.findAll({ requesterId: 'requester' });

    expect(result[0].openPositions?.[0]).toEqual(
      expect.objectContaining({ id: 'job-1' }),
    );
    // Blocks in both directions still produce one isolated cache entry.
    expect(redis.set.mock.calls[0][0]).toContain('exclude');
  });

  it('preserves a missing-company 404 without a requester', async () => {
    users.findOne.mockResolvedValue(null);
    const failure = (await service
      .findOneById({ companyId: 'missing' })
      .catch((error) => error)) as RpcException;
    expect(failure.getError()).toEqual({
      statusCode: 404,
      message: 'There is no company with this id',
    });
  });

  it('returns stable operation errors for non-Error repository failures', async () => {
    const nullFailingQb = companiesQb([]);
    nullFailingQb.getMany = jest.fn().mockRejectedValue(null);
    companies.createQueryBuilder.mockReturnValueOnce(nullFailingQb);
    const listFailure = (await service
      .findAll({})
      .catch((error) => error)) as RpcException;
    expect(listFailure.getError()).toEqual({
      statusCode: 500,
      message: 'An error occurred while fetching all of the companies.',
    });

    companies.count.mockRejectedValueOnce(null);
    const countFailure = (await service
      .countAllCompanies()
      .catch((error) => error)) as RpcException;
    expect(countFailure.getError()).toEqual({
      statusCode: 500,
      message: 'An error occurred while counting all companies.',
    });

    users.findOne.mockRejectedValueOnce(null);
    const detailFailure = (await service
      .findOneById({ companyId: 'company-1' })
      .catch((error) => error)) as RpcException;
    expect(detailFailure.getError()).toEqual({
      statusCode: 500,
      message: 'An error occurred while fetching a company.',
    });
  });
});
