import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Database
  DATABASE_URL: Joi.string().required(),
  DATABASE_SYNCHRONIZE: Joi.string().valid('true', 'false').default('false'),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES: Joi.string().default('1d'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
  JWT_EMAIL_EXPIRES: Joi.string().default('24h'),

  // Email
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().port().default(587),
  EMAIL_USER: Joi.string().email().required(),
  EMAIL_PASSWORD: Joi.string().required(),
  EMAIL_FROM: Joi.string().required(),

  // Throttler
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(5),

  // SMS Services
  TWILIO_ACCOUNT_SID: Joi.string(),
  TWILIO_AUTH_TOKEN: Joi.string(),
  TWILIO_PHONE_NUMBER: Joi.string(),
  PLAS_GATE_API_URL: Joi.string().uri(),
  PLAS_GATE_SECRET_KEY: Joi.string(),
  PLAS_GATE_PRIVATE_KEY: Joi.string(),
  PLAS_GATE_SMS_SENDER: Joi.string(),

  // Services
  API_GATEWAY_PORT: Joi.number().port().default(3000),
  AUTH_SERVICE_PORT: Joi.number().port().default(3001),
  AUTH_SERVICE_HOST: Joi.string().default('localhost'),
  USER_SERVICE_PORT: Joi.number().port().default(3002),
  USER_SERVICE_HOST: Joi.string().default('localhost'),
  RESUME_SERVICE_PORT: Joi.number().port().default(3003),
  RESUME_SERVICE_HOST: Joi.string().default('localhost'),
  CHAT_SERVICE_PORT: Joi.number().port().default(3004),
  CHAT_SERVICE_HOST: Joi.string().default('localhost'),
  JOB_SERVICE_PORT: Joi.number().port().default(3005),
  JOB_SERVICE_HOST: Joi.string().default('localhost'),
  PAYMENT_SERVICE_PORT: Joi.number().port().default(3006),
  PAYMENT_SERVICE_HOST: Joi.string().default('localhost'),

  // Redis
  REDIS_WEBSOCKET_HOST: Joi.string().default('localhost'),
  REDIS_WEBSOCKET_PORT: Joi.number().port().default(6379),

  // Frontend
  FRONTEND_ORIGIN: Joi.string().uri().default('http://localhost:4000'),

  // Social Auth - Google
  GOOGLE_CLIENT_ID: Joi.string(),
  GOOGLE_CLIENT_SECRET: Joi.string(),
  GOOGLE_CALLBACK_URL: Joi.string().uri(),

  // Social Auth - LinkedIn
  LINKEDIN_CLIENT_ID: Joi.string(),
  LINKEDIN_CLIENT_SECRET: Joi.string(),
  LINKEDIN_CALLBACK_URL: Joi.string().uri(),

  // Social Auth - GitHub
  GITHUB_CLIENT_ID: Joi.string(),
  GITHUB_CLIENT_SECRET: Joi.string(),
  GITHUB_CALLBACK_URL: Joi.string().uri(),

  // Social Auth - Facebook
  FACEBOOK_CLIENT_ID: Joi.string(),
  FACEBOOK_CLIENT_SECRET: Joi.string(),
  FACEBOOK_CALLBACK_URL: Joi.string().uri(),

  // Base URL
  BASE_URL: Joi.string().uri().default('http://localhost:3000/'),

  // Node Environment
  NODE_ENV: Joi.string().valid('development', 'production', 'test', 'staging').default('development'),

  // OpenAI
  OPENAI_API_KEY: Joi.string().optional(),

  // Bakong KHQR Configuration
  BAKONG_DEVELOPER_TOKEN: Joi.string(),
  BAKONG_API_BASE_URL: Joi.string().uri().default('https://api-bakong.nbc.gov.kh'),
  BAKONG_API_TIMEOUT: Joi.number().integer().min(5000).max(120000).default(30000),
  BAKONG_RATE_LIMIT_REQUESTS: Joi.number().integer().min(1).max(1000).default(100),
  BAKONG_RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).max(3600000).default(60000),
  BAKONG_QR_IMAGE_DEFAULT_WIDTH: Joi.number().integer().min(100).max(2000).default(300),
  BAKONG_QR_IMAGE_MAX_WIDTH: Joi.number().integer().min(300).max(5000).default(1000),
  BAKONG_QR_EXPIRATION_MAX_MINUTES: Joi.number().integer().min(1).max(525600).default(10080), // Max 1 year
  BAKONG_BULK_PAYMENT_MAX_HASHES: Joi.number().integer().min(1).max(100).default(50),
});