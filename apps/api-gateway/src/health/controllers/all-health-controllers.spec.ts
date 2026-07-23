import 'reflect-metadata';
import { HealthCheckError } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { AuthHealthController } from '../../../../auth-service/src/health/health.controller';
import { ChatHealthController } from '../../../../chat-service/src/health/health.controller';
import { JobHealthController } from '../../../../job-service/src/health/health.controller';
import { NotificationHealthController } from '../../../../notification-service/src/health/health.controller';
import { PaymentHealthController } from '../../../../payment-service/src/health/health.controller';
import { ResumeHealthController } from '../../../../resume-builder-service/src/health/health.controller';
import { UserHealthController } from '../../../../user-service/src/health/health.controller';

describe('Health controllers', () => {
  const health = {
    check: jest.fn(async (checks: Array<() => unknown>) => {
      await Promise.all(checks.map((check) => check()));
      return { status: 'ok' };
    }),
  };
  const database = {
    pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
  };
  const redis = {
    pingCheck: jest.fn().mockResolvedValue({ redis_cache: { status: 'up' } }),
  };
  const microservice = {
    pingCheck: jest.fn().mockResolvedValue({ dependency: { status: 'up' } }),
  };
  const internal = {
    pingCheck: jest.fn().mockResolvedValue({ service: { status: 'up' } }),
  };
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        'services.user.host': 'user-host',
        'services.user.port': 3002,
        'services.notification.host': 'notification-host',
        'services.notification.port': 3007,
        'bakong.developerToken': 'token',
        'bakong.apiBaseUrl': 'https://bakong.example.com',
      };
      return values[key];
    }),
  };

  beforeEach(() => jest.clearAllMocks());

  it('runs gateway readiness dependencies for both readiness routes', async () => {
    const controller = new HealthController(
      health as any,
      database as any,
      redis as any,
      internal as any,
    );
    await expect(controller.checkHealth()).resolves.toEqual({ status: 'ok' });
    await expect(controller.checkReadiness()).resolves.toEqual({
      status: 'ok',
    });
    expect(database.pingCheck).toHaveBeenCalledTimes(2);
    expect(redis.pingCheck).toHaveBeenCalledTimes(2);
    expect(internal.pingCheck).toHaveBeenCalledTimes(14);
  });

  it('returns a stable gateway liveness response', () => {
    jest.spyOn(process, 'uptime').mockReturnValue(12.6);
    jest.useFakeTimers().setSystemTime(new Date('2026-07-23T10:00:00.000Z'));
    const controller = new HealthController(
      health as any,
      database as any,
      redis as any,
      internal as any,
    );
    expect(controller.checkLiveness()).toEqual({
      status: 'ok',
      service: 'api-gateway',
      uptime: 13,
      timestamp: '2026-07-23T10:00:00.000Z',
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('checks auth database, user-service connectivity, and readiness marker', async () => {
    await new AuthHealthController(
      health as any,
      database as any,
      microservice as any,
      config as any,
    ).checkHealth();
    expect(database.pingCheck).toHaveBeenCalled();
    expect(microservice.pingCheck).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ options: { host: 'user-host', port: 3002 } }),
    );
  });

  it('checks chat and job dependency connectivity plus database and Redis', async () => {
    await new ChatHealthController(
      health as any,
      database as any,
      redis as any,
      microservice as any,
      config as any,
    ).checkHealth();
    expect(microservice.pingCheck).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ options: { host: 'user-host', port: 3002 } }),
    );

    await new JobHealthController(
      health as any,
      database as any,
      redis as any,
      microservice as any,
      config as any,
    ).checkHealth();
    expect(microservice.pingCheck).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        options: { host: 'notification-host', port: 3007 },
      }),
    );
  });

  it('checks payment configuration and shared database readiness', async () => {
    const configHealth = { check: jest.fn().mockReturnValue({ status: 'up' }) };
    await new PaymentHealthController(
      health as any,
      database as any,
      configHealth as any,
      config as any,
    ).checkHealth();
    expect(configHealth.check).toHaveBeenCalledWith('bakong_config', {
      developerToken: 'token',
      apiBaseUrl: 'https://bakong.example.com',
    });
  });

  it('checks database and Redis for resume and user services', async () => {
    await new ResumeHealthController(
      health as any,
      database as any,
      redis as any,
    ).checkHealth();
    await new UserHealthController(
      health as any,
      database as any,
      redis as any,
    ).checkHealth();
    expect(database.pingCheck).toHaveBeenCalledTimes(2);
    expect(redis.pingCheck).toHaveBeenCalledTimes(2);
  });

  it('treats intentionally disabled and configured Firebase as healthy', async () => {
    const up = jest.fn((details) => ({
      firebase: { status: 'up', ...details },
    }));
    const down = jest.fn((details) => ({
      firebase: { status: 'down', ...details },
    }));
    const indicator = { check: jest.fn(() => ({ up, down })) };
    const push = { isConfigured: jest.fn().mockReturnValue(true) };
    config.get.mockImplementationOnce((key: string) =>
      key === 'test.disableExternalIntegrations' ? true : undefined,
    );
    await new NotificationHealthController(
      health as any,
      database as any,
      indicator as any,
      push as any,
      config as any,
    ).checkHealth();
    expect(up).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('disabled') }),
    );

    config.get.mockReturnValueOnce(false);
    await new NotificationHealthController(
      health as any,
      database as any,
      indicator as any,
      push as any,
      config as any,
    ).checkHealth();
    expect(up).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('initialized'),
      }),
    );
  });

  it('marks missing Firebase configuration as unhealthy', async () => {
    const indicator = {
      check: jest.fn(() => ({
        up: jest.fn(),
        down: jest.fn((details) => ({
          firebase: { status: 'down', ...details },
        })),
      })),
    };
    const push = { isConfigured: jest.fn().mockReturnValue(false) };
    config.get.mockReturnValueOnce(false);
    await expect(
      new NotificationHealthController(
        health as any,
        database as any,
        indicator as any,
        push as any,
        config as any,
      ).checkHealth(),
    ).rejects.toBeInstanceOf(HealthCheckError);
  });
});
