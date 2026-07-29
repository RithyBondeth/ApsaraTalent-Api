import { register } from 'prom-client';
import {
  getMetrics,
  httpRequestDuration,
  observeHttp,
  observeRpc,
  rpcHandlerDuration,
} from './metrics';

describe('metrics helpers', () => {
  afterEach(() => jest.restoreAllMocks());

  it('records HTTP latency in seconds with normalized labels', () => {
    const observe = jest
      .spyOn(httpRequestDuration, 'observe')
      .mockImplementation();
    observeHttp('POST', '/jobs', 201, 250);
    expect(observe).toHaveBeenCalledWith(
      { method: 'POST', route: '/jobs', status_code: '201' },
      0.25,
    );
  });

  it.each([
    [false, 'ok'],
    [true, 'error'],
  ])('records RPC status and latency for error=%s', (isError, status) => {
    const observe = jest
      .spyOn(rpcHandlerDuration, 'observe')
      .mockImplementation();
    observeRpc('findJobs', isError, 1500);
    expect(observe).toHaveBeenCalledWith({ handler: 'findJobs', status }, 1.5);
  });

  it('returns Prometheus content type and exposition body', async () => {
    jest.spyOn(register, 'metrics').mockResolvedValue('# HELP example\n');
    await expect(getMetrics()).resolves.toEqual({
      contentType: register.contentType,
      body: '# HELP example\n',
    });
  });
});
