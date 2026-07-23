import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BakongRateLimitGuard } from './bakong-rate-limit.guard';

function rpcContext(payload: Record<string, unknown> = {}): ExecutionContext {
  return {
    getType: () => 'rpc',
    getHandler: () => function handler() {},
    switchToRpc: () => ({
      getData: () => payload,
      getContext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function httpContext(request: Record<string, any>): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => function handler() {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('BakongRateLimitGuard', () => {
  it('allows undecorated health RPCs without assuming an HTTP request', () => {
    const reflector = { get: jest.fn().mockReturnValue(undefined) };
    const guard = new BakongRateLimitGuard(reflector as unknown as Reflector);

    expect(guard.canActivate(rpcContext())).toBe(true);
  });

  it('rate limits decorated RPCs by Bakong account', () => {
    const reflector = { get: jest.fn().mockReturnValue(2) };
    const guard = new BakongRateLimitGuard(reflector as unknown as Reflector);
    const context = rpcContext({ bakongAccountId: 'merchant@bank' });

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });

  it.each([[{ userId: 'user-1' }], [{ companyId: 'company-1' }], [{}]])(
    'uses every supported RPC identity fallback',
    (payload) => {
      const reflector = { get: jest.fn().mockReturnValue(1) };
      const guard = new BakongRateLimitGuard(reflector as unknown as Reflector);
      const context = rpcContext(payload);
      expect(guard.canActivate(context)).toBe(true);
      expect(() => guard.canActivate(context)).toThrow(HttpException);
    },
  );

  it.each([
    [{ user: { id: 'user-1' } }],
    [{ ip: '127.0.0.1' }],
    [{ connection: { remoteAddress: '10.0.0.1' } }],
    [{}],
  ])('uses every supported HTTP identity fallback', (request) => {
    const reflector = { get: jest.fn().mockReturnValue(1) };
    const guard = new BakongRateLimitGuard(reflector as unknown as Reflector);
    const context = httpContext(request);
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });

  it('starts a fresh window after expiry and reports a rounded retry delay', () => {
    const reflector = { get: jest.fn().mockReturnValue(1) };
    const guard = new BakongRateLimitGuard(reflector as unknown as Reflector);
    const context = rpcContext({ userId: 'user-1' });
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    expect(guard.canActivate(context)).toBe(true);
    try {
      guard.canActivate(context);
      throw new Error('Expected rate limit');
    } catch (error) {
      expect((error as HttpException).getResponse()).toEqual(
        expect.objectContaining({ retryAfter: 60 }),
      );
    }
    now.mockReturnValue(61_001);
    expect(guard.canActivate(context)).toBe(true);
  });
});
