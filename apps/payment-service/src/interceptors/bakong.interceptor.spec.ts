import { lastValueFrom, of, throwError } from 'rxjs';
import { BakongLoggingInterceptor } from './bakong.interceptor';

describe('BakongLoggingInterceptor', () => {
  const interceptor = new BakongLoggingInterceptor();
  const logger = (interceptor as any).logger;

  beforeEach(() => {
    jest.spyOn(logger, 'log').mockImplementation();
    jest.spyOn(logger, 'error').mockImplementation();
  });

  const context = (body: any) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/bakong/pay', body }),
      }),
    }) as any;

  it('masks credentials and truncates QR values in successful logs', async () => {
    await expect(
      lastValueFrom(
        interceptor.intercept(
          context({
            developerToken: 'secret',
            apiKey: 'key',
            qrString: 'x'.repeat(60),
          }),
          { handle: () => of({ success: true }) },
        ),
      ),
    ).resolves.toEqual({ success: true });
    expect(logger.log.mock.calls[0][0]).toContain('***masked***');
    expect(logger.log.mock.calls[0][0]).not.toContain('secret');
    expect(logger.log.mock.calls[0][0]).toContain('...');
    expect(logger.log.mock.calls[1][0]).toContain('Success: true');
  });

  it('logs and rethrows downstream errors', async () => {
    await expect(
      lastValueFrom(
        interceptor.intercept(context(null), {
          handle: () => throwError(() => new Error('payment failed')),
        }),
      ),
    ).rejects.toThrow('payment failed');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('payment failed'),
    );
  });
});
