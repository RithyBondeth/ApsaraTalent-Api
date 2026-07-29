import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiQuotaService } from './ai-quota.service';
import { RedisService } from '../redis/redis.service';

describe('AiQuotaService', () => {
  let service: AiQuotaService;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    // Mock ConfigService
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'ai.rateLimit') return 10;
        if (key === 'ai.rateLimitWindowMs') return 60000;
        if (key === 'ai.dailyQuota') return 100;
        if (key === 'ai.cvDailyQuota') return 3;
        return null;
      }),
    };

    // Mock RedisService
    const mockRedisService = {
      hitRateLimits: jest.fn(),
      getCounter: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiQuotaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<AiQuotaService>(AiQuotaService);
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;

    // Lock Date to a specific predictable value for tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-21T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.rateLimit).toBe(10);
    expect(service.windowMs).toBe(60000);
    expect(service.dailyQuota).toBe(100);
  });

  describe('getActionQuota', () => {
    it('should return the correct quota for an action', () => {
      expect(service.getActionQuota('cvGeneration')).toBe(3);
    });
  });

  describe('consume', () => {
    it('should allow if all rate limits pass and no action provided', async () => {
      redisService.hitRateLimits.mockResolvedValueOnce({
        allowed: true,
        count: 1,
        failedIndex: -1,
      });

      const result = await service.consume('user-123');
      expect(result).toEqual({ allowed: true, bucket: null, retryAfterSec: 0 });

      expect(redisService.hitRateLimits).toHaveBeenCalledWith([
        {
          key: 'apsaratalent:ai:quota:user-123:2026-07-21',
          limit: 100,
          ttlMs: 86400000,
        },
        // (1705831200000 / 60000) = 29705980 (depending on date ms math)
        expect.objectContaining({ limit: 10, ttlMs: 120000 }),
      ]);
    });

    it('should allow if all rate limits pass when an action is provided', async () => {
      redisService.hitRateLimits.mockResolvedValueOnce({
        allowed: true,
        count: 1,
        failedIndex: -1,
      });

      const result = await service.consume('user-123', 'cvGeneration');
      expect(result).toEqual({ allowed: true, bucket: null, retryAfterSec: 0 });

      expect(redisService.hitRateLimits).toHaveBeenCalledWith([
        {
          key: 'apsaratalent:ai:quota:user-123:cvGeneration:2026-07-21',
          limit: 3,
          ttlMs: 86400000,
        },
        {
          key: 'apsaratalent:ai:quota:user-123:2026-07-21',
          limit: 100,
          ttlMs: 86400000,
        },
        expect.objectContaining({ limit: 10, ttlMs: 120000 }),
      ]);
    });

    it('should deny when burst limit is hit', async () => {
      // index 2 is the burst limit bucket in the order (action[0], daily[1], burst[2]) if action was provided
      // without action, order is daily[0], burst[1]
      redisService.hitRateLimits.mockResolvedValueOnce({
        allowed: false,
        failedIndex: 1,
        count: 0,
      });

      const result = await service.consume('user-123');

      expect(result.allowed).toBe(false);
      expect(result.bucket).toBe('burst');
      // Retry after calculation ensures it wraps positive
      expect(result.retryAfterSec).toBeGreaterThan(0);
    });

    it('should deny when daily limit is hit', async () => {
      // index 0 is the daily limit when no action is provided
      redisService.hitRateLimits.mockResolvedValueOnce({
        allowed: false,
        failedIndex: 0,
        count: 0,
      });

      const result = await service.consume('user-123');

      expect(result.allowed).toBe(false);
      expect(result.bucket).toBe('daily');
      expect(result.retryAfterSec).toBeGreaterThan(0);
    });

    it('should deny when action limit is hit', async () => {
      // index 0 is the action limit when action is provided
      redisService.hitRateLimits.mockResolvedValueOnce({
        allowed: false,
        failedIndex: 0,
        count: 0,
      });

      const result = await service.consume('user-123', 'cvGeneration');

      expect(result.allowed).toBe(false);
      expect(result.bucket).toBe('action');
      expect(result.retryAfterSec).toBeGreaterThan(0);
    });

    it('should default to daily if failedIndex is undefined for some reason', async () => {
      // Simulate unexpected result from Redis
      redisService.hitRateLimits.mockResolvedValueOnce({
        allowed: false,
        failedIndex: 999,
        count: 0,
      });

      const result = await service.consume('user-123');

      expect(result.allowed).toBe(false);
      expect(result.bucket).toBe('daily');
      expect(result.retryAfterSec).toBeGreaterThan(0);
    });
  });

  describe('getUsage', () => {
    it('should return valid usage statistics based on redis counters', async () => {
      // dailyUsed = 10, cvUsed = 1
      redisService.getCounter
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(1);

      const usage = await service.getUsage('user-123');

      expect(usage).toEqual({
        daily: { used: 10, limit: 100, remaining: 90 },
        actions: {
          cvGeneration: { used: 1, limit: 3, remaining: 2 },
        },
        resetsAt: '2026-07-21T23:59:59.999Z',
      });

      expect(redisService.getCounter).toHaveBeenNthCalledWith(
        1,
        'apsaratalent:ai:quota:user-123:2026-07-21',
      );
      expect(redisService.getCounter).toHaveBeenNthCalledWith(
        2,
        'apsaratalent:ai:quota:user-123:cvGeneration:2026-07-21',
      );
    });

    it('should handle zero used accurately', async () => {
      redisService.getCounter.mockResolvedValue(0);

      const usage = await service.getUsage('user-123');

      expect(usage.daily.used).toBe(0);
      expect(usage.daily.remaining).toBe(100);
    });

    it('should floor remaining to 0 if usage exceeds quota (backend mismatch)', async () => {
      redisService.getCounter.mockResolvedValue(150); // Somehow used 150/100

      const usage = await service.getUsage('user-123');

      expect(usage.daily.used).toBe(150);
      expect(usage.daily.remaining).toBe(0);
    });
  });
});
