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
});
