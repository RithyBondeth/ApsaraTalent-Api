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
});