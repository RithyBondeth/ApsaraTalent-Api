import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Node Environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging', 'local')
    .default('development'),

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

  // Throttler
  THROTTLE_TTL: Joi.number().required(),
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
  PAYMENT_SERVICE_PORT: Joi.number().port(),
  PAYMENT_SERVICE_HOST: Joi.string(),

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
  FRONTEND_ORIGIN: Joi.string().uri(),

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

  // Bakong KHQR Configuration
  BAKONG_DEVELOPER_TOKEN: Joi.string(),
  BAKONG_API_BASE_URL: Joi.string().uri(),
  BAKONG_API_TIMEOUT: Joi.number()
    .integer()
    .min(5000)
    .max(120000)
    .default(30000),
  BAKONG_RATE_LIMIT_REQUESTS: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(100),
  BAKONG_RATE_LIMIT_WINDOW_MS: Joi.number()
    .integer()
    .min(1000)
    .max(3600000)
    .default(60000),
  BAKONG_QR_IMAGE_DEFAULT_WIDTH: Joi.number()
    .integer()
    .min(100)
    .max(2000)
    .default(300),
  BAKONG_QR_IMAGE_MAX_WIDTH: Joi.number()
    .integer()
    .min(300)
    .max(5000)
    .default(1000),
  BAKONG_QR_EXPIRATION_MAX_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(525600)
    .default(10080),
  BAKONG_BULK_PAYMENT_MAX_HASHES: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50),
});
