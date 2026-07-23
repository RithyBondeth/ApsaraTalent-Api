import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { FindCompanyService } from './find-company.service';

describe('FindCompanyService', () => {
  const companies = { find: jest.fn(), count: jest.fn() };
  const users = { findOne: jest.fn() };
  const blocks = { find: jest.fn(), exists: jest.fn() };
  const logger = { info: jest.fn(), error: jest.fn() };
  const redis = {
    generateListKey: jest.fn(() => 'companies'),
    generateCompanyKey: jest.fn((_type, id) => `company:${id}`),
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
    blocks.find.mockResolvedValue([]);
  });

  it('returns an unfiltered company list from cache', async () => {
    const cached = [{ id: 'company-1' }];
    redis.get.mockResolvedValue(cached);
    await expect(service.findAll({})).resolves.toBe(cached);
    expect(companies.find).not.toHaveBeenCalled();
  });

  it('excludes blocked companies without using the shared cache', async () => {
    blocks.find.mockResolvedValue([
      { blocker: { id: 'blocked-user' }, blocked: { id: 'requester' } },
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
});
