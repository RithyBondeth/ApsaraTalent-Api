describe('Sentry instrumentation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does not initialize Sentry without a DSN', () => {
    // Keep the key present but empty so dotenv does not repopulate it from the
    // developer's local .env file while this isolated module is loading.
    process.env.SENTRY_DSN = '';
    const init = jest.fn();
    jest.isolateModules(() => {
      jest.doMock('@sentry/nestjs', () => ({ init }));
      jest.requireActual('./instrument');
    });
    expect(init).not.toHaveBeenCalled();
  });

  it('initializes service metadata and samples only application traces', () => {
    process.env.SENTRY_DSN = 'https://public@example.com/1';
    process.env.SENTRY_SERVICE = 'api-gateway';
    process.env.SENTRY_ENVIRONMENT = 'staging';
    process.env.SENTRY_RELEASE = 'release-1';
    process.env.SENTRY_DEBUG = 'true';
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.25';
    const init = jest.fn();
    jest.isolateModules(() => {
      jest.doMock('@sentry/nestjs', () => ({ init }));
      jest.requireActual('./instrument');
    });
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://public@example.com/1',
        environment: 'staging',
        release: 'release-1',
        debug: true,
        serverName: 'api-gateway',
        initialScope: { tags: { service: 'api-gateway' } },
      }),
    );
    const sampler = init.mock.calls[0][0].tracesSampler;
    expect(init.mock.calls[0][0].beforeSend).toBeDefined();
    expect(sampler({ name: 'GET /health', parentSampled: undefined })).toBe(0);
    expect(sampler({ name: 'GET /metrics', parentSampled: undefined })).toBe(0);
    expect(sampler({ name: 'GET /jobs', parentSampled: true })).toBe(true);
    expect(sampler({ name: 'GET /jobs', parentSampled: false })).toBe(false);
    expect(sampler({ name: 'GET /jobs', parentSampled: undefined })).toBe(0.25);
  });

  it('allows tracing to be explicitly disabled', () => {
    process.env.SENTRY_DSN = 'https://public@example.com/1';
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0';
    const init = jest.fn();
    jest.isolateModules(() => {
      jest.doMock('@sentry/nestjs', () => ({ init }));
      jest.requireActual('./instrument');
    });
    expect(
      init.mock.calls[0][0].tracesSampler({
        name: 'GET /jobs',
        parentSampled: undefined,
      }),
    ).toBe(0);
  });

  it('uses deployment defaults when optional Sentry settings are absent', () => {
    process.env.SENTRY_DSN = 'https://public@example.com/1';
    process.env.RAILWAY_SERVICE_NAME = 'user-service';
    process.env.RAILWAY_GIT_COMMIT_SHA = 'commit-sha';
    process.env.NODE_ENV = 'production';
    delete process.env.SENTRY_SERVICE;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.SENTRY_RELEASE;
    delete process.env.SENTRY_DEBUG;
    process.env.SENTRY_TRACES_SAMPLE_RATE = 'invalid';
    const init = jest.fn();
    jest.isolateModules(() => {
      jest.doMock('@sentry/nestjs', () => ({ init }));
      jest.requireActual('./instrument');
    });
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'production',
        release: 'commit-sha',
        debug: false,
        serverName: 'user-service',
      }),
    );
    expect(
      init.mock.calls[0][0].tracesSampler({
        name: 'rpc user.find',
        parentSampled: undefined,
      }),
    ).toBe(0.1);
  });
});
