import { of, throwError } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { observeHttp, observeRpc } from '../metrics/metrics';
import { TimingInterceptor } from './timing.interceptor';

jest.mock('../metrics/metrics', () => ({
  observeHttp: jest.fn(),
  observeRpc: jest.fn(),
}));

describe('TimingInterceptor', () => {
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  const interceptor = new TimingInterceptor(logger as any);

  beforeEach(() => jest.clearAllMocks());

  function httpContext(url: string, statusCode = 200) {
    const req = {
      originalUrl: url,
      method: 'GET',
      baseUrl: '/api',
      route: { path: '/users/:id' },
    };
    const res = { statusCode };
    return {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as any;
  }

  it('skips noisy HTTP paths', async () => {
    await lastValueFrom(
      interceptor.intercept(httpContext('/health'), { handle: () => of('ok') }),
    );
    expect(observeHttp).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('records successful and failed HTTP requests with route patterns', async () => {
    await lastValueFrom(
      interceptor.intercept(httpContext('/api/users/123'), {
        handle: () => of('ok'),
      }),
    );
    expect(observeHttp).toHaveBeenCalledWith(
      'GET',
      '/api/users/:id',
      200,
      expect.any(Number),
    );
    expect(logger.info).toHaveBeenCalled();

    await expect(
      lastValueFrom(
        interceptor.intercept(httpContext('/api/users/123'), {
          handle: () => throwError(() => ({ statusCode: 503 })),
        }),
      ),
    ).rejects.toEqual({ statusCode: 503 });
    expect(observeHttp).toHaveBeenLastCalledWith(
      'GET',
      '/api/users/:id',
      503,
      expect.any(Number),
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('records successful and failed RPC handlers', async () => {
    const context = {
      getType: () => 'rpc',
      getClass: () => ({ name: 'UserController' }),
      getHandler: () => ({ name: 'findOne' }),
    } as any;
    await lastValueFrom(
      interceptor.intercept(context, { handle: () => of('ok') }),
    );
    expect(observeRpc).toHaveBeenCalledWith(
      'UserController.findOne',
      false,
      expect.any(Number),
    );
    expect(logger.info).toHaveBeenCalled();

    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () => throwError(() => new Error('failed')),
        }),
      ),
    ).rejects.toThrow('failed');
    expect(observeRpc).toHaveBeenLastCalledWith(
      'UserController.findOne',
      true,
      expect.any(Number),
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('passes through unsupported execution contexts', async () => {
    const context = { getType: () => 'ws' } as any;
    await expect(
      lastValueFrom(interceptor.intercept(context, { handle: () => of('ok') })),
    ).resolves.toBe('ok');
    expect(observeHttp).not.toHaveBeenCalled();
    expect(observeRpc).not.toHaveBeenCalled();
  });

  it('uses URL and unmatched-route fallbacks and reports generic HTTP errors', async () => {
    const req = {
      originalUrl: '',
      url: '/fallback-url',
      method: 'POST',
      baseUrl: '',
      route: undefined,
    };
    const res = { statusCode: 204 };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as any;

    await lastValueFrom(
      interceptor.intercept(context, { handle: () => of('ok') }),
    );
    expect(observeHttp).toHaveBeenCalledWith(
      'POST',
      'unmatched',
      204,
      expect.any(Number),
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () => throwError(() => 'offline'),
        }),
      ),
    ).rejects.toBe('offline');
    expect(observeHttp).toHaveBeenLastCalledWith(
      'POST',
      'unmatched',
      500,
      expect.any(Number),
    );
  });

  it('warns for slow successful HTTP and RPC operations', async () => {
    const now = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1501)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1501);

    await lastValueFrom(
      interceptor.intercept(httpContext('/api/users/1'), {
        handle: () => of('ok'),
      }),
    );
    const rpcContext = {
      getType: () => 'rpc',
      getClass: () => ({ name: 'UserController' }),
      getHandler: () => ({ name: 'findOne' }),
    } as any;
    await lastValueFrom(
      interceptor.intercept(rpcContext, { handle: () => of('ok') }),
    );

    expect(logger.warn).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });
});
