import 'reflect-metadata';
import { EMPTY, NEVER, of, throwError } from 'rxjs';
import { AUTH, USER_SERVICE } from '@app/contracts';
import { CacheCleanupService } from './cache-cleanup.service';

describe('CacheCleanupService', () => {
  const client = { send: jest.fn() };
  const logger = { info: jest.fn(), warn: jest.fn() };
  const service = new CacheCleanupService(client as any, logger as any);

  beforeEach(() => jest.clearAllMocks());

  it('awaits a successful user-cache invalidation', async () => {
    client.send.mockReturnValue(of({ cleared: true }));
    await expect(service.clear('user-1')).resolves.toBeUndefined();
    expect(client.send).toHaveBeenCalledWith(
      USER_SERVICE.ACTIONS.CLEAR_CURRENT_USER_CACHE,
      { userId: 'user-1' },
    );
    expect(logger.info).toHaveBeenCalledWith(
      '[AUTH] Clearing user cache for userId=user-1',
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('keeps login successful when awaited invalidation fails', async () => {
    client.send.mockReturnValue(throwError(() => new Error('redis down')));
    await expect(service.clear('user-1')).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      '[AUTH] Failed to clear user cache for userId=user-1: redis down',
    );
  });

  it('accepts a successful RPC that completes without a response body', async () => {
    client.send.mockReturnValue(EMPTY);

    await expect(service.clear('user-1')).resolves.toBeUndefined();

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('stops waiting when user-service does not respond', async () => {
    jest.useFakeTimers();
    client.send.mockReturnValue(NEVER);

    const cleanup = service.clear('user-1');
    await jest.advanceTimersByTimeAsync(AUTH.CACHE_CLEANUP_TIMEOUT);

    await expect(cleanup).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        '[AUTH] Failed to clear user cache for userId=user-1:',
      ),
    );
    jest.useRealTimers();
  });

  it('starts social-login invalidation without blocking the caller', async () => {
    client.send.mockReturnValue(of({ cleared: true }));
    expect(service.clearSafe('user-1', 'Google')).toBeUndefined();
    await Promise.resolve();
    expect(client.send).toHaveBeenCalledWith(
      USER_SERVICE.ACTIONS.CLEAR_CURRENT_USER_CACHE,
      { userId: 'user-1' },
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs fire-and-forget invalidation failures without throwing', async () => {
    client.send.mockReturnValue(throwError(() => new Error('timeout')));
    expect(() => service.clearSafe('user-1', 'GitHub')).not.toThrow();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(logger.warn).toHaveBeenCalledWith(
      '[AUTH] Cache clear after GitHub login failed for userId=user-1: timeout',
    );
  });
});
