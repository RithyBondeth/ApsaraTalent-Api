import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Node Environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'local')
    .default('development'),
  DISABLE_EXTERNAL_INTEGRATIONS: Joi.string()
    .valid('true', 'false')
    .default('false'),

  // Database
  DATABASE_URL: Joi.string().required(),
  DATABASE_SYNCHRONIZE: Joi.string(),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES: Joi.string().required(),
  JWT_REFRESH_EXPIRES: Joi.string().required(),
  JWT_EMAIL_EXPIRES: Joi.string().required(),

  // SESSION
  SESSION_SECRET: Joi.string().required(),

  // Email
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().port().default(587),
  EMAIL_USER: Joi.string().email().required(),
  EMAIL_PASSWORD: Joi.string().required(),
  EMAIL_FROM: Joi.string().required(),

  // Outbox (durable transactional email) — see libs/common/src/outbox
  OUTBOX_ENABLED: Joi.string().valid('true', 'false').default('true'),
  OUTBOX_POLL_INTERVAL_MS: Joi.number().integer().min(500).default(5000),
  OUTBOX_BATCH_SIZE: Joi.number().integer().min(1).max(500).default(20),
  OUTBOX_MAX_ATTEMPTS: Joi.number().integer().min(1).max(50).default(5),
  OUTBOX_VISIBILITY_TIMEOUT_MS: Joi.number().integer().min(5000).default(60000),
  OUTBOX_RETENTION_DAYS: Joi.number().integer().min(1).default(30),

  // Throttler
  THROTTLE_TTL: Joi.number().optional(),
  THROTTLE_TTL_MS: Joi.number().integer().min(1000).default(60000),
  THROTTLE_LIMIT: Joi.number().required(),

  // SMS Services
  TWILIO_ACCOUNT_SID: Joi.string(),
  TWILIO_AUTH_TOKEN: Joi.string(),
  TWILIO_PHONE_NUMBER: Joi.string(),

  // Services
  API_GATEWAY_PORT: Joi.number().port(),

  AUTH_SERVICE_PORT: Joi.number().port(),
  AUTH_SERVICE_HOST: Joi.string(),

  USER_SERVICE_PORT: Joi.number().port(),
  USER_SERVICE_HOST: Joi.string(),

  RESUME_SERVICE_PORT: Joi.number().port(),
  RESUME_SERVICE_HOST: Joi.string(),

  CHAT_SERVICE_PORT: Joi.number().port(),
  CHAT_SERVICE_HOST: Joi.string(),

  JOB_SERVICE_PORT: Joi.number().port(),
  JOB_SERVICE_HOST: Joi.string(),

  NOTIFICATION_SERVICE_PORT: Joi.number().port(),
  NOTIFICATION_SERVICE_HOST: Joi.string(),

  // Redis
  REDIS_WEBSOCKET_HOST: Joi.string(),
  REDIS_WEBSOCKET_PORT: Joi.number().port(),

  // Redis Caching
  REDIS_CACHING_HOST: Joi.string(),
  REDIS_CACHING_PORT: Joi.number(),
  REDIS_CACHING_PASSWORD: Joi.string(),
  REDIS_CACHING_USER: Joi.string(),
  REDIS_CACHING_TLS: Joi.string(),
  REDIS_CACHING_TTL: Joi.number(),

  // Frontend
  // May contain one origin, comma-separated origins, or wildcard domains
  // (e.g. https://app.netlify.app,https://*.netlify.app).
  FRONTEND_ORIGIN: Joi.string().allow(''),

  // Social Auth - Google
  GOOGLE_CLIENT_ID: Joi.string(),
  GOOGLE_CLIENT_SECRET: Joi.string(),
  GOOGLE_CALLBACK_URL: Joi.string().uri(),

  // Social Auth - LinkedIn
  LINKEDIN_CLIENT_ID: Joi.string(),
  LINKEDIN_CLIENT_SECRET: Joi.string(),
  LINKEDIN_CALLBACK_URL: Joi.string().uri(),
  LINKEDIN_PROFILE_URL: Joi.string().uri(),

  // Social Auth - GitHub
  GITHUB_CLIENT_ID: Joi.string(),
  GITHUB_CLIENT_SECRET: Joi.string(),
  GITHUB_CALLBACK_URL: Joi.string().uri(),

  // Social Auth - Facebook
  FACEBOOK_CLIENT_ID: Joi.string(),
  FACEBOOK_CLIENT_SECRET: Joi.string(),
  FACEBOOK_CALLBACK_URL: Joi.string().uri(),

  // Base URL
  BASE_URL: Joi.string().uri(),

  // OpenAI
  OPENAI_API_KEY: Joi.string().optional(),

  // AI usage limits (per authenticated user) — see AiQuotaGuard
  AI_RATE_LIMIT: Joi.number().integer().min(1).default(10),
  AI_RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(60000),
  AI_DAILY_QUOTA: Joi.number().integer().min(1).default(100),
  AI_CV_DAILY_QUOTA: Joi.number().integer().min(1).default(3),

  // Error monitoring (Sentry) — blank/unset disables reporting
  SENTRY_DSN: Joi.string().allow('').optional(),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0.1),

  // Metrics (Prometheus) — empty is convenient locally; production /metrics
  // fails closed until a strong bearer token is configured.
  METRICS_TOKEN: Joi.string().min(32).allow('').optional(),

  // Firebase (Push Notifications)
  FIREBASE_SERVICE_ACCOUNT: Joi.string().optional(),

  // PostHog analytics — both optional so an unset key just no-ops.
  POSTHOG_KEY: Joi.string().allow('').optional(),
  POSTHOG_HOST: Joi.string().uri().optional(),

  // File storage. The S3 credentials are only required when the S3 driver is
  // selected, so local development needs no bucket at all — but once
  // STORAGE_DRIVER=s3 the process refuses to boot with them missing rather than
  // silently writing uploads to an ephemeral container disk.
  STORAGE_DRIVER: Joi.string().valid('local', 's3').default('local'),
  S3_BUCKET: Joi.string().when('STORAGE_DRIVER', {
    is: 's3',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  S3_REGION: Joi.string().when('STORAGE_DRIVER', {
    is: 's3',
    // R2 ignores region but the SDK still requires one; 'auto' is the
    // conventional value there.
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  S3_ACCESS_KEY_ID: Joi.string().when('STORAGE_DRIVER', {
    is: 's3',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  S3_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_DRIVER', {
    is: 's3',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  S3_ENDPOINT: Joi.string().uri().optional(),
  S3_FORCE_PATH_STYLE: Joi.string().valid('true', 'false').default('false'),
  S3_PUBLIC_BASE_URL: Joi.string().uri().optional(),
  S3_SIGNED_URL_EXPIRY_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(604800)
    .default(900),
});
