import { validationSchema } from './validation.schema';

describe('environment validation schema', () => {
  const required = {
    DATABASE_URL: 'postgres://localhost/test',
    JWT_SECRET: 'secret',
    JWT_EXPIRES: '15m',
    JWT_REFRESH_EXPIRES: '7d',
    JWT_EMAIL_EXPIRES: '1d',
    SESSION_SECRET: 'session-secret',
    SMTP_HOST: 'smtp.example.com',
    EMAIL_USER: 'mail@example.com',
    EMAIL_PASSWORD: 'password',
    EMAIL_FROM: 'noreply@example.com',
    THROTTLE_TTL: 60,
    THROTTLE_LIMIT: 100,
  };

  it('applies safe defaults for local storage and quotas', () => {
    const { error, value } = validationSchema.validate(required);
    expect(error).toBeUndefined();
    expect(value).toEqual(
      expect.objectContaining({
        NODE_ENV: 'development',
        SMTP_PORT: 587,
        STORAGE_DRIVER: 'local',
        S3_FORCE_PATH_STYLE: 'false',
        S3_SIGNED_URL_EXPIRY_SECONDS: 900,
        AI_RATE_LIMIT: 10,
        AI_DAILY_QUOTA: 100,
      }),
    );
  });

  it.each([
    ['DATABASE_URL', 'DATABASE_URL'],
    ['JWT_SECRET', 'JWT_SECRET'],
    ['SESSION_SECRET', 'SESSION_SECRET'],
    ['SMTP_HOST', 'SMTP_HOST'],
  ])('rejects a missing required %s', (field, expected) => {
    const input = { ...required };
    delete (input as any)[field];
    expect(validationSchema.validate(input).error?.message).toContain(expected);
  });

  it('requires every S3 credential when the S3 driver is selected', () => {
    const { error } = validationSchema.validate({
      ...required,
      STORAGE_DRIVER: 's3',
      S3_BUCKET: 'bucket',
    });
    expect(error?.message).toContain('S3_REGION');
  });

  it('accepts a complete S3/R2 configuration', () => {
    const { error, value } = validationSchema.validate({
      ...required,
      STORAGE_DRIVER: 's3',
      S3_BUCKET: 'bucket',
      S3_REGION: 'auto',
      S3_ACCESS_KEY_ID: 'key',
      S3_SECRET_ACCESS_KEY: 'secret',
      S3_ENDPOINT: 'https://r2.example.com',
      S3_PUBLIC_BASE_URL: 'https://cdn.example.com',
      S3_SIGNED_URL_EXPIRY_SECONDS: 300,
    });
    expect(error).toBeUndefined();
    expect(value.STORAGE_DRIVER).toBe('s3');
  });

  it.each([
    [{ NODE_ENV: 'staging' }, 'NODE_ENV'],
    [{ GOOGLE_CALLBACK_URL: 'not-a-url' }, 'GOOGLE_CALLBACK_URL'],
    [{ AI_RATE_LIMIT: 0 }, 'AI_RATE_LIMIT'],
    [{ SENTRY_TRACES_SAMPLE_RATE: 2 }, 'SENTRY_TRACES_SAMPLE_RATE'],
    [{ S3_SIGNED_URL_EXPIRY_SECONDS: 10 }, 'S3_SIGNED_URL_EXPIRY_SECONDS'],
  ])('rejects invalid environment values', (overrides, field) => {
    const { error } = validationSchema.validate({ ...required, ...overrides });
    expect(error?.message).toContain(field);
  });
});
