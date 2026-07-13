export default () => ({
  nodeEnv: process.env.NODE_ENV,

  test: {
    disableExternalIntegrations:
      process.env.NODE_ENV === 'test' &&
      process.env.DISABLE_EXTERNAL_INTEGRATIONS === 'true',
  },

  database: {
    url: process.env.DATABASE_URL,
    // Never allow TypeORM to mutate a production schema at application start.
    // Production changes must be applied through reviewed migrations.
    synchronize:
      process.env.NODE_ENV !== 'production' &&
      process.env.DATABASE_SYNCHRONIZE === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES,
    emailExpiresIn: process.env.JWT_EMAIL_EXPIRES,
  },

  session: {
    secret: process.env.SESSION_SECRET,
  },

  email: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM,
  },

  throttle: {
    ttl: Number(process.env.THROTTLE_TTL),
    limit: Number(process.env.THROTTLE_LIMIT),
  },

  sms: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
  },

  services: {
    apiGateway: {
      port: Number(process.env.API_GATEWAY_PORT),
    },

    auth: {
      host: process.env.AUTH_SERVICE_HOST,
      port: Number(process.env.AUTH_SERVICE_PORT),
      metricsPort: Number(process.env.AUTH_SERVICE_METRICS_PORT) || 9101,
    },

    user: {
      host: process.env.USER_SERVICE_HOST,
      port: Number(process.env.USER_SERVICE_PORT),
      metricsPort: Number(process.env.USER_SERVICE_METRICS_PORT) || 9102,
    },

    resume: {
      host: process.env.RESUME_SERVICE_HOST,
      port: Number(process.env.RESUME_SERVICE_PORT),
      metricsPort: Number(process.env.RESUME_SERVICE_METRICS_PORT) || 9103,
    },

    chat: {
      host: process.env.CHAT_SERVICE_HOST,
      port: Number(process.env.CHAT_SERVICE_PORT),
      metricsPort: Number(process.env.CHAT_SERVICE_METRICS_PORT) || 9104,
    },

    job: {
      host: process.env.JOB_SERVICE_HOST,
      port: Number(process.env.JOB_SERVICE_PORT),
      metricsPort: Number(process.env.JOB_SERVICE_METRICS_PORT) || 9105,
    },

    payment: {
      host: process.env.PAYMENT_SERVICE_HOST,
      port: Number(process.env.PAYMENT_SERVICE_PORT),
      metricsPort: Number(process.env.PAYMENT_SERVICE_METRICS_PORT) || 9106,
    },

    notification: {
      host: process.env.NOTIFICATION_SERVICE_HOST,
      port: Number(process.env.NOTIFICATION_SERVICE_PORT),
      metricsPort:
        Number(process.env.NOTIFICATION_SERVICE_METRICS_PORT) || 9107,
    },
  },

  redis: {
    websocket: {
      host: process.env.REDIS_WEBSOCKET_HOST,
      port: Number(process.env.REDIS_WEBSOCKET_PORT),
    },

    caching: {
      host: process.env.REDIS_CACHING_HOST,
      port: Number(process.env.REDIS_CACHING_PORT),
      username: process.env.REDIS_CACHING_USER,
      password: process.env.REDIS_CACHING_PASSWORD,
      tls: process.env.REDIS_CACHING_TLS === 'true',
      ttl: Number(process.env.REDIS_CACHING_TTL),
    },
  },

  frontend: {
    origin: process.env.FRONTEND_ORIGIN,
  },

  social: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },

    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackUrl: process.env.LINKEDIN_CALLBACK_URL,
      profileUrl: process.env.LINKEDIN_PROFILE_URL,
    },

    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: process.env.GITHUB_CALLBACK_URL,
    },

    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackUrl: process.env.FACEBOOK_CALLBACK_URL,
    },
  },

  baseUrl: process.env.BASE_URL,

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o',
  },

  ai: {
    rateLimit: Number(process.env.AI_RATE_LIMIT) || 10,
    rateLimitWindowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60000,
    dailyQuota: Number(process.env.AI_DAILY_QUOTA) || 100,
  },

  firebase: {
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT,
  },

  bakong: {
    developerToken: process.env.BAKONG_DEVELOPER_TOKEN,
    apiBaseUrl: process.env.BAKONG_API_BASE_URL,
    apiTimeout: Number(process.env.BAKONG_API_TIMEOUT),

    rateLimitRequests: Number(process.env.BAKONG_RATE_LIMIT_REQUESTS),
    rateLimitWindowMs: Number(process.env.BAKONG_RATE_LIMIT_WINDOW_MS),

    qrImageDefaultWidth: Number(process.env.BAKONG_QR_IMAGE_DEFAULT_WIDTH),
    qrImageMaxWidth: Number(process.env.BAKONG_QR_IMAGE_MAX_WIDTH),

    qrExpirationMaxMinutes: Number(
      process.env.BAKONG_QR_EXPIRATION_MAX_MINUTES,
    ),

    bulkPaymentMaxHashes: Number(process.env.BAKONG_BULK_PAYMENT_MAX_HASHES),
  },
});
