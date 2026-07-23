import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { getMetrics } from './metrics';
import { MetricsController } from './metrics.controller';

jest.mock('./metrics', () => ({ getMetrics: jest.fn() }));

describe('MetricsController', () => {
  const originalToken = process.env.METRICS_TOKEN;
  const response = () => ({ setHeader: jest.fn(), send: jest.fn() });

  beforeEach(() => {
    jest.clearAllMocks();
    (getMetrics as jest.Mock).mockResolvedValue({
      contentType: 'text/plain',
      body: 'metric 1',
    });
  });
  afterEach(() => {
    process.env.METRICS_TOKEN = originalToken;
  });

  it('serves metrics openly when no token is configured', async () => {
    delete process.env.METRICS_TOKEN;
    const res = response();
    await new MetricsController().metrics(
      { headers: {}, query: {} } as any,
      res as any,
    );
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
    expect(res.send).toHaveBeenCalledWith('metric 1');
  });

  it.each([
    [{ authorization: 'Bearer secret' }, {}],
    [{}, { token: 'secret' }],
  ])('accepts a configured scrape token', async (headers, query) => {
    process.env.METRICS_TOKEN = 'secret';
    const res = response();
    await new MetricsController().metrics(
      { headers, query } as any,
      res as any,
    );
    expect(res.send).toHaveBeenCalled();
  });

  it('rejects missing, malformed, and incorrect scrape tokens', async () => {
    process.env.METRICS_TOKEN = 'secret';
    const controller = new MetricsController();
    for (const headers of [
      {},
      { authorization: 'Basic abc' },
      { authorization: 'Bearer wrong' },
    ]) {
      await expect(
        controller.metrics({ headers, query: {} } as any, response() as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });
});
