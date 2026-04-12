import { GatewayTimeoutException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, TimeoutError, timeout } from 'rxjs';

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Wraps a microservice RPC call with a timeout.
 * Throws GatewayTimeoutException if no response within timeoutMs.
 */
export function rpcCall<T = any>(
  client: ClientProxy,
  pattern: string | Record<string, unknown>,
  payload: unknown,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  return firstValueFrom(
    client.send<T>(pattern, payload).pipe(timeout(timeoutMs)),
  ).catch((error) => {
    if (error instanceof TimeoutError) {
      throw new GatewayTimeoutException(
        'Service timeout. Please try again later.',
      );
    }
    throw error;
  });
}
