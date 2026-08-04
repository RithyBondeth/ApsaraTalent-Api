import 'reflect-metadata';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { getMetrics } from './metrics';
import { MetricsController } from './metrics.controller';

jest.mock('./metrics', () => ({ getMetrics: jest.fn() }));

describe('MetricsController', () => {
  const originalToken = process.env.METRICS_TOKEN;
  const originalNodeEnv = process.env.NODE_ENV;
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
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('serves metrics openly when no token is configured', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.METRICS_TOKEN;
    const res = response();
    await new MetricsController().metrics(
      { headers: {}, query: {} } as any,
      res as any,
    );
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
    expect(res.send).toHaveBeenCalledWith('metric 1');
  });

  it('fails closed in production when no token is configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.METRICS_TOKEN;
    await expect(
      new MetricsController().metrics(
        { headers: {}, query: {} } as any,
        response() as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('accepts a configured bearer token', async () => {
    process.env.METRICS_TOKEN = 'secret';
    const res = response();
    await new MetricsController().metrics(
      { headers: { authorization: 'Bearer secret' }, query: {} } as any,
      res as any,
    );
    expect(res.send).toHaveBeenCalled();
  });

  it('does not accept credentials in the query string', async () => {
    process.env.METRICS_TOKEN = 'secret';
    await expect(
      new MetricsController().metrics(
        { headers: {}, query: { token: 'secret' } } as any,
        response() as any,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
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
