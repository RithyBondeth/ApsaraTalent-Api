import configuration, { resolveThrottleTtlMs } from './configuration';

describe('throttle window resolution', () => {
  const originalTtl = process.env.THROTTLE_TTL;
  const originalTtlMs = process.env.THROTTLE_TTL_MS;

  beforeEach(() => {
    delete process.env.THROTTLE_TTL;
    delete process.env.THROTTLE_TTL_MS;
  });

  afterEach(() => {
    process.env.THROTTLE_TTL = originalTtl;
    process.env.THROTTLE_TTL_MS = originalTtlMs;
  });

  it('treats the legacy seconds value as seconds, not milliseconds', () => {
    // The regression this guards: THROTTLE_TTL=60 was passed straight to
    // @nestjs/throttler v6, which reads ms — a 60ms window is no rate limit.
    process.env.THROTTLE_TTL = '60';

    expect(resolveThrottleTtlMs()).toBe(60_000);
  });

  it('passes through a legacy value already written in milliseconds', () => {
    process.env.THROTTLE_TTL = '60000';

    expect(resolveThrottleTtlMs()).toBe(60_000);
  });

  it('prefers the explicit millisecond variable over the legacy one', () => {
    process.env.THROTTLE_TTL_MS = '30000';
    process.env.THROTTLE_TTL = '60';

    expect(resolveThrottleTtlMs()).toBe(30_000);
  });

  it.each([undefined, '', 'abc', '0', '-5'])(
    'falls back to a safe default when the value is %p',
    (value) => {
      if (value !== undefined) process.env.THROTTLE_TTL = value;

      expect(resolveThrottleTtlMs()).toBe(60_000);
    },
  );

  it('never yields a sub-second window through the config factory', () => {
    process.env.THROTTLE_TTL = '60';

    expect(configuration().throttle.ttl).toBeGreaterThanOrEqual(1000);
  });
});

describe('production configuration safety', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSynchronize = process.env.DATABASE_SYNCHRONIZE;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.DATABASE_SYNCHRONIZE = originalSynchronize;
  });

  it('forces schema synchronization off in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_SYNCHRONIZE = 'true';

    expect(configuration().database.synchronize).toBe(false);
  });

  it('allows synchronization only in a non-production environment', () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_SYNCHRONIZE = 'true';

    expect(configuration().database.synchronize).toBe(true);
  });
});
