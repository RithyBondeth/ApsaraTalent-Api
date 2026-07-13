import configuration from './configuration';

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
