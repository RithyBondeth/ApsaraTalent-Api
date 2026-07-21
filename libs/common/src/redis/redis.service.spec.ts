import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';

const PREFIX = 'apsaratalent:user-service';

describe('RedisService', () => {
  let service: RedisService;
  let cacheManager: any;

  // A mock in-memory client (no real eval or get like redis)
  const buildCacheManager = (overrides: Partial<any> = {}) => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clear: jest.fn(),
    stores: [{ client: null }],
    ...overrides,
  });

  const setup = async (cacheOverrides: Partial<any> = {}) => {
    cacheManager = buildCacheManager(cacheOverrides);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();
    service = module.get<RedisService>(RedisService);
  };

  beforeEach(() => setup());
  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── Key generators ───────────────────────────────────────────────────────

  describe('key generators', () => {
    it('generateUserKey', () => {
      expect(service.generateUserKey('detail', 'u1')).toBe(
        `${PREFIX}:user:detail:u1`,
      );
    });

    it('generateEmployeeKey', () => {
      expect(service.generateEmployeeKey('favorites', 'e1')).toBe(
        `${PREFIX}:employee:favorites:e1`,
      );
    });

    it('generateCompanyKey', () => {
      expect(service.generateCompanyKey('detail', 'c1')).toBe(
        `${PREFIX}:company:detail:c1`,
      );
    });

    it('generateListKey serialises filters to JSON', () => {
      const key = service.generateListKey('employee', { page: 1 });
      expect(key).toBe(
        `${PREFIX}:employee:list:${JSON.stringify({ page: 1 })}`,
      );
    });

    it('generateSearchKey sorts query keys alphabetically', () => {
      const key = service.generateSearchKey('job', { z: 1, a: 2 });
      expect(key).toContain(':job:search:');
      expect(key).toContain('"a":2');
      expect(key.indexOf('"a"')).toBeLessThan(key.indexOf('"z"'));
    });

    it('generateEmployeeFavoriteCountKey delegates to generateEmployeeKey', () => {
      expect(service.generateEmployeeFavoriteCountKey('e1')).toBe(
        `${PREFIX}:employee:favorite-count:e1`,
      );
    });

    it('generateCompanyFavoriteCountKey delegates to generateCompanyKey', () => {
      expect(service.generateCompanyFavoriteCountKey('c1')).toBe(
        `${PREFIX}:company:favorite-count:c1`,
      );
    });

    it('generateEmployeeFavoritesKey delegates to generateEmployeeKey', () => {
      expect(service.generateEmployeeFavoritesKey('e1')).toBe(
        `${PREFIX}:employee:favorites:e1`,
      );
    });

    it('generateCompanyFavoritesKey delegates to generateCompanyKey', () => {
      expect(service.generateCompanyFavoritesKey('c1')).toBe(
        `${PREFIX}:company:favorites:c1`,
      );
    });

    it('generateAuthSessionKey', () => {
      expect(service.generateAuthSessionKey('u1')).toBe(
        'apsaratalent:auth:session:u1',
      );
    });

    it('generateJobListKey', () => {
      expect(service.generateJobListKey()).toBe(
        'apsaratalent:job-service:job:list:all',
      );
    });

    it('generateJobSearchKey sorts query keys', () => {
      const key = service.generateJobSearchKey({ z: 1, a: 2 });
      expect(key).toContain('apsaratalent:job-service:job:search:');
      expect(key.indexOf('"a"')).toBeLessThan(key.indexOf('"z"'));
    });

    it('generateMatchingKey', () => {
      expect(service.generateMatchingKey('employee-matching', 'e1')).toBe(
        'apsaratalent:job-service:matching:employee-matching:e1',
      );
    });

    it('generateRecentChatsKey', () => {
      expect(service.generateRecentChatsKey('u1')).toBe(
        'apsaratalent:chat-service:chat:recent:u1',
      );
    });

    it('generateUnreadCountKey', () => {
      expect(service.generateUnreadCountKey('u1')).toBe(
        'apsaratalent:chat-service:chat:unread-count:u1',
      );
    });

    it('generateTemplateListKey', () => {
      expect(service.generateTemplateListKey()).toBe(
        'apsaratalent:resume-service:templates:all',
      );
    });

    it('generateTemplateDetailKey', () => {
      expect(service.generateTemplateDetailKey('t1')).toBe(
        'apsaratalent:resume-service:templates:detail:t1',
      );
    });

    it('generateTemplateSearchKey', () => {
      const q = { term: 'nurse' };
      expect(service.generateTemplateSearchKey(q)).toBe(
        `apsaratalent:resume-service:templates:search:${JSON.stringify(q)}`,
      );
    });

    it('generateNotificationUnreadCountKey', () => {
      expect(service.generateNotificationUnreadCountKey('u1')).toBe(
        'apsaratalent:notification-service:unread-count:u1',
      );
    });

    it('generateNotificationListKey', () => {
      expect(service.generateNotificationListKey('u1', 2, 20, false)).toBe(
        'apsaratalent:notification-service:list:u1:page:2:limit:20:unread:false',
      );
    });
  });

  // ─── Basic cache operations ────────────────────────────────────────────────

  describe('get', () => {
    it('returns the cached value', async () => {
      cacheManager.get.mockResolvedValue({ name: 'Alice' });
      expect(await service.get('some-key')).toEqual({ name: 'Alice' });
    });

    it('returns null when cache returns falsy', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      expect(await service.get('missing')).toBeNull();
    });

    it('swallows errors and returns undefined', async () => {
      cacheManager.get.mockRejectedValue(new Error('Redis down'));
      await expect(service.get('key')).resolves.toBeUndefined();
    });

    it('handles non-Error exceptions', async () => {
      cacheManager.get.mockRejectedValue('string error');
      await expect(service.get('key')).resolves.toBeUndefined();
    });
  });

  describe('set', () => {
    it('calls cacheManager.set with key, value, and ttl', async () => {
      await service.set('k', 'v', 3000);
      expect(cacheManager.set).toHaveBeenCalledWith('k', 'v', 3000);
    });

    it('calls cacheManager.set without ttl when omitted', async () => {
      await service.set('k', 'v');
      expect(cacheManager.set).toHaveBeenCalledWith('k', 'v', undefined);
    });

    it('swallows errors silently', async () => {
      cacheManager.set.mockRejectedValue(new Error('write fail'));
      await expect(service.set('k', 'v')).resolves.toBeUndefined();
    });

    it('handles non-Error exceptions on set', async () => {
      cacheManager.set.mockRejectedValue('raw string error');
      await expect(service.set('k', 'v')).resolves.toBeUndefined();
    });
  });

  describe('del', () => {
    it('calls cacheManager.del with the key', async () => {
      await service.del('k');
      expect(cacheManager.del).toHaveBeenCalledWith('k');
    });

    it('swallows errors silently', async () => {
      cacheManager.del.mockRejectedValue(new Error('del fail'));
      await expect(service.del('k')).resolves.toBeUndefined();
    });

    it('handles non-Error exceptions on del', async () => {
      cacheManager.del.mockRejectedValue('raw error');
      await expect(service.del('k')).resolves.toBeUndefined();
    });
  });

  // ─── hitRateLimits ────────────────────────────────────────────────────────

  describe('hitRateLimits', () => {
    it('returns allowed immediately for empty buckets', async () => {
      const result = await service.hitRateLimits([]);
      expect(result).toEqual({ allowed: true, failedIndex: -1, count: 0 });
    });

    it('uses fallback (cache-manager) when no real Redis client is available', async () => {
      // no client set up → falls into hitRateLimitsFallback
      cacheManager.get.mockResolvedValue(0); // current count=0
      const buckets = [{ key: 'k1', limit: 5, ttlMs: 60_000 }];
      const result = await service.hitRateLimits(buckets);
      expect(result.allowed).toBe(true);
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('fallback blocks when bucket is already at limit', async () => {
      cacheManager.get.mockResolvedValue(5); // already at limit
      const buckets = [{ key: 'k1', limit: 5, ttlMs: 60_000 }];
      const result = await service.hitRateLimits(buckets);
      expect(result.allowed).toBe(false);
      expect(result.failedIndex).toBe(0);
      expect(result.count).toBe(5);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('uses real redis client eval path when client has eval', async () => {
      const mockClient = {
        isReady: true,
        eval: jest.fn().mockResolvedValue([1, 0, 0]),
      };
      await setup({
        stores: [{ client: mockClient }],
      });
      const buckets = [{ key: 'k1', limit: 5, ttlMs: 60_000 }];
      const result = await service.hitRateLimits(buckets);
      expect(result.allowed).toBe(true);
      expect(mockClient.eval).toHaveBeenCalled();
    });

    it('parses denied result from redis eval correctly', async () => {
      const mockClient = {
        isReady: true,
        eval: jest.fn().mockResolvedValue([0, 1, 5]), // denied, position 1, count 5
      };
      await setup({ stores: [{ client: mockClient }] });
      const buckets = [{ key: 'k1', limit: 5, ttlMs: 60_000 }];
      const result = await service.hitRateLimits(buckets);
      expect(result.allowed).toBe(false);
      expect(result.failedIndex).toBe(0); // position - 1
      expect(result.count).toBe(5);
    });

    it('falls back to hitRateLimitsFallback when eval throws', async () => {
      const mockClient = {
        isReady: true,
        eval: jest.fn().mockRejectedValue(new Error('EVAL failed')),
      };
      await setup({ stores: [{ client: mockClient }] });
      cacheManager.get.mockResolvedValue(0);
      const buckets = [{ key: 'k1', limit: 5, ttlMs: 60_000 }];
      const result = await service.hitRateLimits(buckets);
      // Should have degraded gracefully and fallen through to fallback
      expect(result.allowed).toBe(true);
    });

    it('allows through (fail-open) when both eval and fallback throw', async () => {
      const mockClient = {
        isReady: true,
        eval: jest.fn().mockRejectedValue(new Error('EVAL error')),
      };
      await setup({ stores: [{ client: mockClient }] });
      cacheManager.get.mockRejectedValue(new Error('cache also broken'));
      const buckets = [{ key: 'k1', limit: 5, ttlMs: 60_000 }];
      const result = await service.hitRateLimits(buckets);
      expect(result).toEqual({ allowed: true, failedIndex: -1, count: 0 });
    });
  });

  // ─── getCounter ───────────────────────────────────────────────────────────

  describe('getCounter', () => {
    it('reads from cacheManager when no real client', async () => {
      cacheManager.get.mockResolvedValue(7);
      expect(await service.getCounter('some-key')).toBe(7);
    });

    it('returns 0 when key is missing', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      expect(await service.getCounter('missing')).toBe(0);
    });

    it('returns 0 on error', async () => {
      cacheManager.get.mockRejectedValue(new Error('fail'));
      expect(await service.getCounter('k')).toBe(0);
    });

    it('reads from real client.get when available', async () => {
      const mockClient = {
        isReady: true,
        get: jest.fn().mockResolvedValue('12'),
      };
      await setup({ stores: [{ client: mockClient }] });
      expect(await service.getCounter('k')).toBe(12);
    });

    it('normalizes string numbers from redis INCR', async () => {
      cacheManager.get.mockResolvedValue('3');
      // Without real client, fallback to cache-manager
      expect(await service.getCounter('k')).toBe(3);
    });
  });

  // ─── getReadyClient (tested indirectly via hitRateLimits) ─────────────────

  describe('getReadyClient (indirect tests)', () => {
    it('connects a client that is not yet open', async () => {
      const mockClient = {
        isReady: false,
        isOpen: false,
        connect: jest.fn().mockResolvedValue(undefined),
        eval: jest.fn().mockResolvedValue([1, 0, 0]),
      };
      // After connect, mark as ready
      mockClient.connect.mockImplementation(async () => {
        mockClient.isReady = true;
      });
      await setup({ stores: [{ client: mockClient }] });
      const buckets = [{ key: 'k', limit: 5, ttlMs: 60_000 }];
      await service.hitRateLimits(buckets);
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('returns null if client has no connect function (no redis client)', async () => {
      const mockClient = { isReady: false }; // no connect, no eval
      await setup({ stores: [{ client: mockClient }] });
      cacheManager.get.mockResolvedValue(0);
      const buckets = [{ key: 'k', limit: 5, ttlMs: 60_000 }];
      const result = await service.hitRateLimits(buckets);
      // Falls back to cache-manager
      expect(result.allowed).toBe(true);
    });

    it('returns null if connect throws during lazy connection', async () => {
      const mockClient = {
        isReady: false,
        isOpen: false,
        connect: jest.fn().mockRejectedValue(new Error('connection refused')),
      };
      await setup({ stores: [{ client: mockClient }] });
      cacheManager.get.mockResolvedValue(0);
      const buckets = [{ key: 'k', limit: 5, ttlMs: 60_000 }];
      // Should fall back gracefully
      const result = await service.hitRateLimits(buckets);
      expect(result.allowed).toBe(true);
    });
  });

  // ─── delPattern ───────────────────────────────────────────────────────────

  describe('delPattern', () => {
    it('deletes matching keys when client has keys()', async () => {
      const mockClient = {
        keys: jest.fn().mockResolvedValue(['key:1', 'key:2']),
      };
      await setup({
        stores: [{ getClient: () => mockClient }],
      });
      await service.delPattern('user:*');
      expect(mockClient.keys).toHaveBeenCalledWith(`${PREFIX}:user:*`);
      expect(cacheManager.del).toHaveBeenCalledTimes(2);
    });

    it('does nothing when no matching keys found', async () => {
      const mockClient = {
        keys: jest.fn().mockResolvedValue([]),
      };
      await setup({ stores: [{ getClient: () => mockClient }] });
      await service.delPattern('nothing:*');
      expect(cacheManager.del).not.toHaveBeenCalled();
    });

    it('falls back to clear() when client has no keys()', async () => {
      // No client at all → store.getClient is undefined
      await setup({ stores: [{}] });
      await service.delPattern('user:*');
      expect(cacheManager.clear).toHaveBeenCalled();
    });

    it('swallows errors silently', async () => {
      const mockClient = {
        keys: jest.fn().mockRejectedValue(new Error('redis error')),
      };
      await setup({ stores: [{ getClient: () => mockClient }] });
      await expect(service.delPattern('user:*')).resolves.toBeUndefined();
    });
  });

  // ─── Invalidation helpers ─────────────────────────────────────────────────

  describe('invalidateUser', () => {
    it('deletes detail, profile, and settings keys', async () => {
      await service.invalidateUser('u1');
      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      expect(cacheManager.del).toHaveBeenCalledWith(`${PREFIX}:user:detail:u1`);
      expect(cacheManager.del).toHaveBeenCalledWith(
        `${PREFIX}:user:profile:u1`,
      );
      expect(cacheManager.del).toHaveBeenCalledWith(
        `${PREFIX}:user:settings:u1`,
      );
    });
  });

  describe('invalidateEmployee', () => {
    it('deletes detail, favorites, and favorite-count keys', async () => {
      await service.invalidateEmployee('e1');
      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      expect(cacheManager.del).toHaveBeenCalledWith(
        `${PREFIX}:employee:detail:e1`,
      );
    });
  });

  describe('invalidateCompany', () => {
    it('deletes detail, favorites, and favorite-count keys', async () => {
      await service.invalidateCompany('c1');
      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      expect(cacheManager.del).toHaveBeenCalledWith(
        `${PREFIX}:company:detail:c1`,
      );
    });
  });

  describe('invalidateListPages', () => {
    it('deletes default pages 1, 2, 3', async () => {
      await service.invalidateListPages('employee');
      expect(cacheManager.del).toHaveBeenCalledTimes(3);
    });

    it('deletes custom pages', async () => {
      await service.invalidateListPages('employee', [1, 2]);
      expect(cacheManager.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearUserDetailCache', () => {
    it('deletes only the detail key', async () => {
      await service.clearUserDetailCache('u1');
      expect(cacheManager.del).toHaveBeenCalledWith(`${PREFIX}:user:detail:u1`);
      expect(cacheManager.del).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateAuthSession', () => {
    it('deletes the session key', async () => {
      await service.invalidateAuthSession('u1');
      expect(cacheManager.del).toHaveBeenCalledWith(
        'apsaratalent:auth:session:u1',
      );
    });
  });

  describe('invalidateJobSearchCaches', () => {
    it('calls delPattern for job:search:* and job:list:*', async () => {
      // Fallback path — no client
      await service.invalidateJobSearchCaches();
      expect(cacheManager.clear).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidateMatchingCaches', () => {
    it('deletes 6 matching keys', async () => {
      await service.invalidateMatchingCaches('e1', 'c1');
      expect(cacheManager.del).toHaveBeenCalledTimes(6);
    });
  });

  describe('invalidateChatCaches', () => {
    it('deletes 2 keys for one user', async () => {
      await service.invalidateChatCaches('u1');
      expect(cacheManager.del).toHaveBeenCalledTimes(2);
    });

    it('deletes 4 keys for two users', async () => {
      await service.invalidateChatCaches('u1', 'u2');
      expect(cacheManager.del).toHaveBeenCalledTimes(4);
    });
  });

  describe('invalidateTemplateCaches', () => {
    it('deletes only list key when no templateId', async () => {
      await service.invalidateTemplateCaches();
      expect(cacheManager.del).toHaveBeenCalledTimes(1);
      expect(cacheManager.del).toHaveBeenCalledWith(
        'apsaratalent:resume-service:templates:all',
      );
    });

    it('also deletes detail key when templateId is provided', async () => {
      await service.invalidateTemplateCaches('t1');
      expect(cacheManager.del).toHaveBeenCalledTimes(2);
      expect(cacheManager.del).toHaveBeenCalledWith(
        'apsaratalent:resume-service:templates:detail:t1',
      );
    });
  });

  describe('invalidateNotificationCaches', () => {
    it('deletes unread-count key and calls delPattern for list', async () => {
      await service.invalidateNotificationCaches('u1');
      // del for unread-count + clear() from delPattern fallback
      expect(cacheManager.del).toHaveBeenCalledWith(
        'apsaratalent:notification-service:unread-count:u1',
      );
      expect(cacheManager.clear).toHaveBeenCalled();
    });
  });
});
