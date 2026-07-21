import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AiQuotaGuard } from './ai-quota.guard';
import { AiQuotaService } from '../ai-quota.service';
import { AI_QUOTA_ACTION_KEY } from '../decorators/ai-quota-action.decorator';

describe('AiQuotaGuard', () => {
  let guard: AiQuotaGuard;
  let aiQuotaService: jest.Mocked<AiQuotaService>;
  let reflector: jest.Mocked<Reflector>;

  // Helper to build a mock ExecutionContext
  const buildContext = (userId?: string, hasSetHeader = true) => {
    const mockResponse = hasSetHeader ? { setHeader: jest.fn() } : {}; // Simulate environments without setHeader

    const mockRequest = {
      user: userId ? { id: userId } : undefined,
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
      getHandler: jest.fn().mockReturnValue(() => {}),
      getClass: jest.fn().mockReturnValue(class MockController {}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const mockAiQuotaService = {
      consume: jest.fn(),
      rateLimit: 10,
      windowMs: 60_000,
      dailyQuota: 100,
      getActionQuota: jest.fn().mockReturnValue(3),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiQuotaGuard,
        { provide: AiQuotaService, useValue: mockAiQuotaService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<AiQuotaGuard>(AiQuotaGuard);
    aiQuotaService = module.get(AiQuotaService) as jest.Mocked<AiQuotaService>;
    reflector = module.get(Reflector) as jest.Mocked<Reflector>;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true and skip quota check if no userId is present', async () => {
      const context = buildContext(undefined); // No user

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(aiQuotaService.consume).not.toHaveBeenCalled();
    });

    it('should return true if quota decision is allowed', async () => {
      const context = buildContext('user-1');
      reflector.getAllAndOverride.mockReturnValue(undefined); // No specific action
      aiQuotaService.consume.mockResolvedValue({
        allowed: true,
        bucket: null,
        retryAfterSec: 0,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(aiQuotaService.consume).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should pass the action to consume when decorator is present', async () => {
      const context = buildContext('user-1');
      reflector.getAllAndOverride.mockReturnValue('cvGeneration');
      aiQuotaService.consume.mockResolvedValue({
        allowed: true,
        bucket: null,
        retryAfterSec: 0,
      });

      await guard.canActivate(context);

      expect(aiQuotaService.consume).toHaveBeenCalledWith(
        'user-1',
        'cvGeneration',
      );
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        AI_QUOTA_ACTION_KEY,
        expect.any(Array),
      );
    });

    it('should throw a 429 with burst message when the burst bucket is hit', async () => {
      const context = buildContext('user-1');
      reflector.getAllAndOverride.mockReturnValue(undefined);
      aiQuotaService.consume.mockResolvedValue({
        allowed: false,
        bucket: 'burst',
        retryAfterSec: 30,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      try {
        await guard.canActivate(context);
      } catch (err) {
        const e = err as HttpException;
        expect(e.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const body = e.getResponse() as any;
        expect(body.message).toContain('rate limit');
        expect(body.message).toContain('10');
        expect(body.message).toContain('60s');
      }
    });

    it('should set Retry-After header when response supports setHeader', async () => {
      const context = buildContext('user-1', true);
      const mockRes = context.switchToHttp().getResponse() as any;
      reflector.getAllAndOverride.mockReturnValue(undefined);
      aiQuotaService.consume.mockResolvedValue({
        allowed: false,
        bucket: 'daily',
        retryAfterSec: 3600,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Retry-After', '3600');
    });

    it('should NOT fail if response does not have a setHeader method', async () => {
      const context = buildContext('user-1', false); // No setHeader
      reflector.getAllAndOverride.mockReturnValue(undefined);
      aiQuotaService.consume.mockResolvedValue({
        allowed: false,
        bucket: 'daily',
        retryAfterSec: 3600,
      });

      // Should still throw 429, but without crashing on missing setHeader
      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should enforce Retry-After to be at least 1, even if retryAfterSec is 0', async () => {
      const context = buildContext('user-1', true);
      const mockRes = context.switchToHttp().getResponse() as any;
      reflector.getAllAndOverride.mockReturnValue(undefined);
      aiQuotaService.consume.mockResolvedValue({
        allowed: false,
        bucket: 'daily',
        retryAfterSec: 0,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Retry-After', '1');
    });

    it('should throw a 429 with daily message when the daily bucket is hit', async () => {
      const context = buildContext('user-1');
      reflector.getAllAndOverride.mockReturnValue(undefined);
      aiQuotaService.consume.mockResolvedValue({
        allowed: false,
        bucket: 'daily',
        retryAfterSec: 100,
      });

      try {
        await guard.canActivate(context);
      } catch (err) {
        const e = err as HttpException;
        const body = e.getResponse() as any;
        expect(body.message).toContain('Daily AI usage limit');
        expect(body.message).toContain('100 requests/day');
      }
    });

    it('should throw a 429 with cvGeneration message when the action bucket is hit', async () => {
      const context = buildContext('user-1');
      reflector.getAllAndOverride.mockReturnValue('cvGeneration');
      aiQuotaService.consume.mockResolvedValue({
        allowed: false,
        bucket: 'action',
        retryAfterSec: 100,
      });

      try {
        await guard.canActivate(context);
      } catch (err) {
        const e = err as HttpException;
        const body = e.getResponse() as any;
        expect(body.message).toContain('Daily CV generation limit');
        expect(body.message).toContain('3 per day');
      }
    });

    it('should throw daily message for unknown action bucket (fallback)', async () => {
      const context = buildContext('user-1');
      reflector.getAllAndOverride.mockReturnValue('unknownAction' as any);
      aiQuotaService.consume.mockResolvedValue({
        allowed: false,
        bucket: 'action', // bucket is 'action' but action type is not 'cvGeneration'
        retryAfterSec: 100,
      });

      try {
        await guard.canActivate(context);
      } catch (err) {
        const e = err as HttpException;
        const body = e.getResponse() as any;
        expect(body.message).toContain('Daily AI usage limit');
      }
    });
  });
});
