import { CacheInvalidationService } from './cache-invalidation.service';

describe('CacheInvalidationService', () => {
  const redis = {
    del: jest.fn(),
    delPattern: jest.fn(),
    generateUserKey: jest.fn((kind, id) => `user:${kind}:${id}`),
    generateEmployeeKey: jest.fn((kind, id) => `employee:${kind}:${id}`),
    generateCompanyKey: jest.fn((kind, id) => `company:${kind}:${id}`),
    generateListKey: jest.fn((kind) => `${kind}:list`),
  };
  const companies = { findOne: jest.fn() };
  const users = { find: jest.fn() };
  const service = new CacheInvalidationService(
    redis as any,
    companies as any,
    users as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redis.del.mockResolvedValue(undefined);
    redis.delPattern.mockResolvedValue(undefined);
  });

  it('invalidates owning user details and the employee list', async () => {
    users.find.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
    await service.invalidateEmployeeCache('employee-1');
    expect(redis.del).toHaveBeenCalledWith('user:detail:user-1');
    expect(redis.del).toHaveBeenCalledWith('user:detail:user-2');
    expect(redis.del).toHaveBeenCalledWith('user:list');
  });

  it('handles user, employee, and favorite update events', async () => {
    await service.handleUserUpdate({ userId: 'user-1' });
    expect(redis.del).toHaveBeenCalledTimes(3);

    jest.clearAllMocks();
    await service.handleEmployeeUpdate({ employeeId: 'employee-1' });
    expect(redis.del).toHaveBeenCalledWith('employee:detail:employee-1');
    expect(redis.delPattern).toHaveBeenCalledWith('employee:list:*');
    expect(redis.delPattern).toHaveBeenCalledWith('employee:search:*');

    jest.clearAllMocks();
    await service.handleEmployeeFavoritesUpdate({ employeeId: 'employee-1' });
    expect(redis.del).toHaveBeenCalledWith('employee:favorites:employee-1');
    expect(redis.del).toHaveBeenCalledWith(
      'employee:favorite-count:employee-1',
    );
  });

  it('invalidates company and owner-user caches', async () => {
    companies.findOne.mockResolvedValue({
      id: 'company-1',
      user: { id: 'owner-1' },
    });
    await service.handleCompanyUpdate({ companyId: 'company-1' });
    expect(redis.del).toHaveBeenCalledWith('company:detail:company-1');
    expect(redis.del).toHaveBeenCalledWith('user:detail:owner-1');
    expect(redis.delPattern).toHaveBeenCalledWith('company:list:*');
    expect(redis.delPattern).toHaveBeenCalledWith('user:list:*');
  });

  it('still invalidates company lists when no owner is found', async () => {
    companies.findOne.mockResolvedValue(null);
    await service.handleCompanyUpdate({ companyId: 'company-1' });
    expect(redis.del).toHaveBeenCalledTimes(1);
    expect(redis.del).toHaveBeenCalledWith('company:detail:company-1');
  });

  it('invalidates company favorites and refreshes the first three list pages', async () => {
    await service.handleCompanyFavoritesUpdate({ companyId: 'company-1' });
    expect(redis.del).toHaveBeenCalledTimes(2);
    jest.clearAllMocks();
    await service.handleRefreshLists();
    expect(redis.del).toHaveBeenCalledTimes(6);
    expect(redis.del).toHaveBeenCalledWith('employee:list:page:1:limit:10');
    expect(redis.del).toHaveBeenCalledWith('company:list:page:3:limit:10');
    await expect(service.handleClearAllCache()).resolves.toBeUndefined();
  });
});
