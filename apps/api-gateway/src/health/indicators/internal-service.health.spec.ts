import 'reflect-metadata';
import { HealthCheckError } from '@nestjs/terminus';
import { of, throwError } from 'rxjs';
import { AUTH_SERVICE, HEALTH_PATTERN } from '@app/contracts/constants';
import { InternalServiceHealthIndicator } from './internal-service.health';

describe('InternalServiceHealthIndicator', () => {
  const up = jest.fn((details) => ({ status: 'up', ...details }));
  const down = jest.fn((details) => ({ status: 'down', ...details }));
  const health = { check: jest.fn(() => ({ up, down })) };
  const client = { send: jest.fn() };
  const create = () =>
    new InternalServiceHealthIndicator(
      health as any,
      client as any,
      client as any,
      client as any,
      client as any,
      client as any,
      client as any,
      client as any,
    );

  beforeEach(() => jest.clearAllMocks());

  it('reports a ready internal service and preserves diagnostic details', async () => {
    client.send.mockReturnValue(
      of({ status: 'ok', details: { database: 'up' } }),
    );
    await expect(create().pingCheck(AUTH_SERVICE.NAME)).resolves.toMatchObject({
      status: 'up',
      details: { database: 'up' },
    });
    expect(client.send).toHaveBeenCalledWith(HEALTH_PATTERN, {});
  });

  it('fails closed for unknown clients and unhealthy responses', async () => {
    await expect(create().pingCheck('unknown-service')).rejects.toBeInstanceOf(
      HealthCheckError,
    );
    client.send.mockReturnValue(of({ status: 'degraded' }));
    await expect(create().pingCheck(AUTH_SERVICE.NAME)).rejects.toBeInstanceOf(
      HealthCheckError,
    );
    expect(down).toHaveBeenCalledWith({
      message: 'Unexpected health status: degraded',
    });
  });

  it('converts RPC errors and non-error failures into health failures', async () => {
    client.send.mockReturnValue(
      throwError(() => new Error('connection refused')),
    );
    await expect(create().pingCheck(AUTH_SERVICE.NAME)).rejects.toBeInstanceOf(
      HealthCheckError,
    );
    expect(down).toHaveBeenLastCalledWith({ message: 'connection refused' });
    client.send.mockImplementation(() => {
      throw 'failure';
    });
    await expect(create().pingCheck(AUTH_SERVICE.NAME)).rejects.toBeInstanceOf(
      HealthCheckError,
    );
    expect(down).toHaveBeenLastCalledWith({ message: 'Health RPC failed' });
  });
});
