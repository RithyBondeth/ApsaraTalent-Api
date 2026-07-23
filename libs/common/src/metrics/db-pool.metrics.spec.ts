import { Gauge, register } from 'prom-client';
import { DbPoolMetrics } from './db-pool.metrics';

jest.mock('prom-client', () => ({
  Gauge: jest.fn(),
  register: { getSingleMetric: jest.fn() },
}));

describe('DbPoolMetrics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('warns and returns when the pg pool is unavailable', () => {
    const service = new DbPoolMetrics({ driver: {}, options: {} } as any);
    const logger = (service as any).logger;
    jest.spyOn(logger, 'warn').mockImplementation();
    service.onModuleInit();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('pg pool not found'),
    );
    expect(Gauge).not.toHaveBeenCalled();
  });

  it('registers live total, idle, waiting, and maximum gauges', () => {
    const pool = {
      totalCount: 5,
      idleCount: 2,
      waitingCount: 1,
      options: { max: 10 },
    };
    const service = new DbPoolMetrics({
      driver: { master: pool },
      options: {},
    } as any);
    jest.spyOn((service as any).logger, 'log').mockImplementation();
    service.onModuleInit();
    expect(Gauge).toHaveBeenCalledTimes(4);
    const names = (Gauge as unknown as jest.Mock).mock.calls.map(
      ([options]) => options.name,
    );
    expect(names).toEqual([
      'db_pool_connections_total',
      'db_pool_connections_idle',
      'db_pool_connections_waiting',
      'db_pool_max',
    ]);
    const values = (Gauge as unknown as jest.Mock).mock.calls.map(
      ([options]) => {
        const target = { set: jest.fn() };
        options.collect.call(target);
        return target.set.mock.calls[0][0];
      },
    );
    expect(values).toEqual([5, 2, 1, 10]);
  });

  it('does not double-register existing metrics', () => {
    (register.getSingleMetric as jest.Mock).mockReturnValue({});
    const service = new DbPoolMetrics({
      driver: { master: { totalCount: 1, idleCount: 1, waitingCount: 0 } },
      options: { extra: { max: 4 } },
    } as any);
    jest.spyOn((service as any).logger, 'log').mockImplementation();
    service.onModuleInit();
    expect(Gauge).not.toHaveBeenCalled();
  });
});
