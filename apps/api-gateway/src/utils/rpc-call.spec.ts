import { GatewayTimeoutException } from '@nestjs/common';
import { NEVER, of, throwError } from 'rxjs';
import { rpcCall } from './rpc-call';

describe('rpcCall', () => {
  it('returns successful RPC values unchanged', async () => {
    const client = { send: jest.fn(() => of({ id: 'value' })) };
    await expect(rpcCall(client as any, 'pattern', { id: 1 })).resolves.toEqual(
      {
        id: 'value',
      },
    );
  });

  it('uses the explicit timeout and maps expiration to HTTP 504', async () => {
    jest.useFakeTimers();
    const client = { send: jest.fn(() => NEVER) };
    const promise = rpcCall(client as any, { cmd: 'slow' }, {}, 25);
    const caught = promise.catch((error) => error);
    await jest.advanceTimersByTimeAsync(26);
    const error = await caught;
    expect(error).toBeInstanceOf(GatewayTimeoutException);
    expect(error.message).toBe('Service timeout. Please try again later.');
    jest.useRealTimers();
  });

  it.each([
    new Error('connection refused'),
    { statusCode: 422, message: ['invalid payload'] },
    'malformed service failure',
    null,
  ])('preserves non-timeout and malformed RPC errors', async (error) => {
    const client = { send: jest.fn(() => throwError(() => error)) };
    await expect(rpcCall(client as any, 'pattern', {})).rejects.toBe(error);
  });
});
