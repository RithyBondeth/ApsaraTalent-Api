export default () => ({
  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES || '1d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
    emailExpiresIn: process.env.JWT_EMAIL_EXPIRES || '24h',
  },

  // Email Configuration
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM,
  },

  // Throttler Configuration
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT) || 5,
  },

  // SMS Configuration
  sms: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    plasgate: {
      apiUrl: process.env.PLAS_GATE_API_URL,
      secretKey: process.env.PLAS_GATE_SECRET_KEY,
      privateKey: process.env.PLAS_GATE_PRIVATE_KEY,
      smsSender: process.env.PLAS_GATE_SMS_SENDER,
    },
  },

  // Services Configuration
  services: {
    apiGateway: {
      port: parseInt(process.env.API_GATEWAY_PORT) || 3000,
    },
    auth: {
      port: parseInt(process.env.AUTH_SERVICE_PORT) || 3001,
      host: process.env.AUTH_SERVICE_HOST || 'localhost',
    },
    user: {
      port: parseInt(process.env.USER_SERVICE_PORT) || 3002,
      host: process.env.USER_SERVICE_HOST || 'localhost',
    },
    resume: {
      port: parseInt(process.env.RESUME_SERVICE_PORT) || 3003,
      host: process.env.RESUME_SERVICE_HOST || 'localhost',
    },
    chat: {
      port: parseInt(process.env.CHAT_SERVICE_PORT) || 3004,
      host: process.env.CHAT_SERVICE_HOST || 'localhost',
    },
    job: {
      port: parseInt(process.env.JOB_SERVICE_PORT) || 3005,
      host: process.env.JOB_SERVICE_HOST || 'localhost',
    },
    payment: {
      port: parseInt(process.env.PAYMENT_SERVICE_PORT) || 3006,
      host: process.env.PAYMENT_SERVICE_HOST || 'localhost', 
    }
  },

  // Redis Configuration
  redis: {
    websocket: {
      host: process.env.REDIS_WEBSOCKET_HOST || 'localhost',
      port: parseInt(process.env.REDIS_WEBSOCKET_PORT) || 6379,
    },
  },

  // Frontend Configuration
  frontend: {
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:4000',
  },

  // Social Auth Configuration
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

  // Base URL
  baseUrl: process.env.BASE_URL || 'http://localhost:3000/',

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || null,
  },
});