import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { FindCompanyService } from './find-company.service';

describe('FindCompanyService', () => {
  const companies = { find: jest.fn(), count: jest.fn() };
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

  it('excludes blocked companies without using the shared cache', async () => {
    blockRows.mockResolvedValue([
      { blockerId: 'blocked-user', blockedId: 'requester' },
    ]);
    companies.find
      .mockResolvedValueOnce([{ id: 'blocked-company' }])
      .mockResolvedValueOnce([{ id: 'visible', name: 'Visible' }]);
    await service.findAll({ requesterId: 'requester' });
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
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
    companies.find.mockResolvedValueOnce(null);
    const empty = (await service
      .findAll({})
      .catch((error) => error)) as RpcException;
    expect(empty.getError()).toEqual({
      statusCode: 500,
      message: 'There are no companies available.',
    });
    companies.find.mockRejectedValueOnce(new Error('list failed'));
    const failed = (await service
      .findAll({})
      .catch((error) => error)) as RpcException;
    expect(failed.getError()).toEqual({
      statusCode: 500,
      message: 'list failed',
    });
  });

  it('returns cached counts and company details', async () => {
    redis.get.mockResolvedValueOnce({ totalCompanies: 4 });
    await expect(service.countAllCompanies()).resolves.toEqual({
      totalCompanies: 4,
    });
    redis.get.mockResolvedValueOnce({ id: 'company-1' });
    await expect(
      service.findOneById({ companyId: 'company-1' }),
    ).resolves.toEqual({
      id: 'company-1',
    });
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

  it('collects blocks in both directions and maps visible job positions', async () => {
    blockRows.mockResolvedValue([
      { blockerId: 'requester', blockedId: 'blocked-a' },
      { blockerId: 'blocked-b', blockedId: 'requester' },
    ]);
    companies.find
      .mockResolvedValueOnce([{ id: 'company-blocked' }])
      .mockResolvedValueOnce([
        {
          id: 'company-visible',
          openPositions: [{ id: 'job-1', skillsRequired: '' }],
        },
      ]);

    const result = await service.findAll({ requesterId: 'requester' });

    expect(result[0].openPositions?.[0]).toEqual(
      expect.objectContaining({ id: 'job-1' }),
    );
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
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
    companies.find.mockRejectedValueOnce(null);
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
