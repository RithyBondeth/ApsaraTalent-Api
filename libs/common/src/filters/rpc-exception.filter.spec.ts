import { BadRequestException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import * as Sentry from '@sentry/nestjs';
import { firstValueFrom } from 'rxjs';
import { GlobalRpcExceptionFilter } from './rpc-exception.filter';

jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));

describe('GlobalRpcExceptionFilter', () => {
  const filter = new GlobalRpcExceptionFilter();

  function rpcHost() {
    return { getType: () => 'rpc' } as any;
  }

  it('rethrows structured RPC errors without reporting expected failures', async () => {
    const result = filter.catch(
      new RpcException({ statusCode: 404, message: 'Missing' }),
      rpcHost(),
    )!;
    await expect(firstValueFrom(result as any)).rejects.toEqual({
      statusCode: 404,
      message: 'Missing',
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('normalizes string and validation-array RPC payloads', async () => {
    await expect(
      firstValueFrom(
        filter.catch(new RpcException('failed'), rpcHost()) as any,
      ),
    ).rejects.toEqual({ statusCode: 500, message: 'failed' });
    await expect(
      firstValueFrom(
        filter.catch(
          new RpcException({
            statusCode: 400,
            message: ['email invalid', 'name required'],
          }),
          rpcHost(),
        ) as any,
      ),
    ).rejects.toEqual({
      statusCode: 400,
      message: 'email invalid, name required',
    });
  });

  it('writes normalized HTTP exceptions to the HTTP response', () => {
    const response = { status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({ getResponse: () => response }),
    } as any;
    expect(
      filter.catch(new BadRequestException(['bad one', 'bad two']), host),
    ).toBeUndefined();
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'bad one, bad two',
    });
  });

  it('reports unexpected errors and protects against non-error throws', async () => {
    const failure = new Error('database failed');
    await expect(
      firstValueFrom(filter.catch(failure, rpcHost()) as any),
    ).rejects.toEqual({
      statusCode: 500,
      message: 'database failed',
    });
    expect(Sentry.captureException).toHaveBeenCalledWith(failure);

    await expect(
      firstValueFrom(filter.catch('unexpected', rpcHost()) as any),
    ).rejects.toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});
