import 'reflect-metadata';
import { HealthCheckError } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { AuthHealthController } from '../../../../auth-service/src/health/health.controller';
import { ChatHealthController } from '../../../../chat-service/src/health/health.controller';
import { JobHealthController } from '../../../../job-service/src/health/health.controller';
import { NotificationHealthController } from '../../../../notification-service/src/health/health.controller';
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
  const outbox = {
    pendingCount: jest.fn().mockResolvedValue(0),
  };
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        'services.user.host': 'user-host',
        'services.user.port': 3002,
        'services.notification.host': 'notification-host',
        'services.notification.port': 3007,
      };
      return values[key];
    }),
  };

  beforeEach(() => jest.clearAllMocks());

  it('keeps root health lightweight and reserves dependencies for readiness', async () => {
    jest.spyOn(process, 'uptime').mockReturnValue(5);
    process.env.SENTRY_RELEASE = 'release-root';
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T00:00:00.000Z'));
    const controller = new HealthController(
      health as any,
      database as any,
      redis as any,
      internal as any,
    );
    expect(controller.checkHealth()).toEqual({
      status: 'ok',
      service: 'api-gateway',
      release: 'release-root',
      uptime: 5,
      timestamp: '2026-08-04T00:00:00.000Z',
    });
    await expect(controller.checkReadiness()).resolves.toEqual({
      status: 'ok',
    });
    expect(database.pingCheck).toHaveBeenCalledTimes(1);
    expect(redis.pingCheck).toHaveBeenCalledTimes(1);
    expect(internal.pingCheck).toHaveBeenCalledTimes(6);
    jest.useRealTimers();
    delete process.env.SENTRY_RELEASE;
    jest.restoreAllMocks();
  });

  it('returns a stable gateway liveness response', () => {
    jest.spyOn(process, 'uptime').mockReturnValue(12.6);
    process.env.SENTRY_RELEASE = 'release-1';
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
      release: 'release-1',
      uptime: 13,
      timestamp: '2026-07-23T10:00:00.000Z',
    });
    jest.useRealTimers();
    delete process.env.SENTRY_RELEASE;
    jest.restoreAllMocks();
  });

  // The deploy workflow stamps SENTRY_RELEASE explicitly because `railway up`
  // leaves RAILWAY_GIT_COMMIT_SHA empty. If a stale RAILWAY_GIT_COMMIT_SHA ever
  // outranked it, /health/live would report a different build than Sentry and
  // the release verification would compare against the wrong value.
  it('reports the release CI stamped, not a stale Railway commit SHA', () => {
    process.env.SENTRY_RELEASE = 'ci-sha';
    process.env.RAILWAY_GIT_COMMIT_SHA = 'stale-railway-sha';
    const controller = new HealthController(
      health as any,
      database as any,
      redis as any,
      internal as any,
    );
    expect(controller.checkLiveness().release).toBe('ci-sha');
    delete process.env.SENTRY_RELEASE;
    delete process.env.RAILWAY_GIT_COMMIT_SHA;
  });

  it('reports "unknown" when no release source is set', () => {
    delete process.env.SENTRY_RELEASE;
    delete process.env.RAILWAY_GIT_COMMIT_SHA;
    delete process.env.GITHUB_SHA;
    const controller = new HealthController(
      health as any,
      database as any,
      redis as any,
      internal as any,
    );
    expect(controller.checkLiveness().release).toBe('unknown');
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
      outbox as any,
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
      outbox as any,
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
        outbox as any,
        config as any,
      ).checkHealth(),
    ).rejects.toBeInstanceOf(HealthCheckError);
  });

  it('reports the outbox backlog as a gauge rather than a readiness gate', async () => {
    const up = jest.fn((details) => ({ outbox: { status: 'up', ...details } }));
    const indicator = { check: jest.fn(() => ({ up, down: jest.fn() })) };
    const push = { isConfigured: jest.fn().mockReturnValue(true) };
    outbox.pendingCount.mockResolvedValue(1200);
    config.get.mockImplementation((key: string) =>
      key === 'outbox.enabled' ? true : undefined,
    );

    // A backlog this size is a problem, but failing readiness would pull the
    // only process that can drain it out of rotation.
    await expect(
      new NotificationHealthController(
        health as any,
        database as any,
        indicator as any,
        push as any,
        outbox as any,
        config as any,
      ).checkHealth(),
    ).resolves.toEqual({ status: 'ok' });
    expect(up).toHaveBeenCalledWith({ pending: 1200, dispatcher: 'enabled' });
  });

  it('marks the outbox down when its backlog cannot be read', async () => {
    const indicator = {
      check: jest.fn(() => ({
        up: jest.fn(),
        down: jest.fn((details) => ({
          outbox: { status: 'down', ...details },
        })),
      })),
    };
    const push = { isConfigured: jest.fn().mockReturnValue(true) };
    outbox.pendingCount.mockRejectedValue(new Error('relation is missing'));
    config.get.mockImplementation(() => undefined);

    await expect(
      new NotificationHealthController(
        health as any,
        database as any,
        indicator as any,
        push as any,
        outbox as any,
        config as any,
      ).checkHealth(),
    ).rejects.toBeInstanceOf(HealthCheckError);
  });
});
