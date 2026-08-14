import { CacheInvalidationService } from './cache-invalidation.service';
import {
  generateAuthSessionKey,
  generateCompanyKey,
  generateEmployeeFavoriteCountKey,
  generateEmployeeKey,
  generateUserKey,
} from './redis-keys.util';

describe('CacheInvalidationService', () => {
  const redis = {
    del: jest.fn(),
    delPattern: jest.fn(),
    invalidateJobSearchCaches: jest.fn(),
    invalidateMatchingProfileCaches: jest.fn(),
  };
  const users = { find: jest.fn() };
  const service = new CacheInvalidationService(redis as any, users as any);

  beforeEach(() => {
    jest.clearAllMocks();
    redis.del.mockResolvedValue(undefined);
    redis.delPattern.mockResolvedValue(undefined);
    redis.invalidateJobSearchCaches.mockResolvedValue(undefined);
    redis.invalidateMatchingProfileCaches.mockResolvedValue(undefined);
    users.find.mockResolvedValue([]);
  });

  it('invalidates employee detail, owner, list, search, and derived caches', async () => {
    users.find.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
    await service.invalidateEmployeeCache('employee-1');
    expect(redis.del).toHaveBeenCalledWith(
      generateEmployeeKey('detail', 'employee-1'),
    );
    expect(redis.del).toHaveBeenCalledWith(generateUserKey('detail', 'user-1'));
    expect(redis.del).toHaveBeenCalledWith(generateAuthSessionKey('user-2'));
    expect(redis.delPattern).toHaveBeenCalledWith('employee:list:*');
    expect(redis.delPattern).toHaveBeenCalledWith('employee:search:*');
    expect(redis.delPattern).toHaveBeenCalledWith('user:list:*');
    expect(redis.invalidateMatchingProfileCaches).toHaveBeenCalled();
  });

  it('handles user, employee, and favorite update events', async () => {
    await service.handleUserUpdate({ userId: 'user-1' });
    expect(redis.del).toHaveBeenCalledTimes(3);

    jest.clearAllMocks();
    await service.handleEmployeeUpdate({ employeeId: 'employee-1' });
    expect(redis.del).toHaveBeenCalledWith(
      generateEmployeeKey('detail', 'employee-1'),
    );
    expect(redis.delPattern).toHaveBeenCalledWith('employee:list:*');
    expect(redis.delPattern).toHaveBeenCalledWith('employee:search:*');

    jest.clearAllMocks();
    await service.handleEmployeeFavoritesUpdate({ employeeId: 'employee-1' });
    expect(redis.del).toHaveBeenCalledWith(
      generateEmployeeKey('favorites', 'employee-1'),
    );
    expect(redis.del).toHaveBeenCalledWith(
      generateEmployeeFavoriteCountKey('employee-1'),
    );
  });

  it('invalidates company and owner-user caches', async () => {
    users.find.mockResolvedValue([{ id: 'owner-1' }]);
    await service.handleCompanyUpdate({ companyId: 'company-1' });
    expect(redis.del).toHaveBeenCalledWith(
      generateCompanyKey('detail', 'company-1'),
    );
    expect(redis.del).toHaveBeenCalledWith(
      generateUserKey('detail', 'owner-1'),
    );
    expect(redis.del).toHaveBeenCalledWith(generateAuthSessionKey('owner-1'));
    expect(redis.delPattern).toHaveBeenCalledWith('company:list:*');
    expect(redis.delPattern).toHaveBeenCalledWith('user:list:*');
    expect(redis.invalidateJobSearchCaches).toHaveBeenCalled();
    expect(redis.invalidateMatchingProfileCaches).toHaveBeenCalled();
  });

  it('still invalidates company lists when no owner is found', async () => {
    users.find.mockResolvedValue([]);
    await service.handleCompanyUpdate({ companyId: 'company-1' });
    expect(redis.del).toHaveBeenCalledTimes(1);
    expect(redis.del).toHaveBeenCalledWith(
      generateCompanyKey('detail', 'company-1'),
    );
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
