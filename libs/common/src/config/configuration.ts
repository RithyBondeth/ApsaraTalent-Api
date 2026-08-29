const DEFAULT_THROTTLE_TTL_MS = 60_000;
// Strict budget, for credential-handling routes (login, OTP, reset, refresh).
const DEFAULT_STRICT_THROTTLE_LIMIT = 5;
// Blanket budget applied to every gateway route. Generous enough that normal
// browsing never trips it, low enough to blunt scraping and upload floods.
const DEFAULT_GLOBAL_THROTTLE_LIMIT = 300;

/**
 * Resolve the throttler window in milliseconds.
 *
 * THROTTLE_TTL_MS is authoritative when set. Otherwise the legacy THROTTLE_TTL
 * is interpreted as seconds — values that small can only have been meant as
 * seconds, since a sub-second window is never a real rate limit.
 */
export const resolveThrottleTtlMs = (): number => {
  const explicitMs = Number(process.env.THROTTLE_TTL_MS);
  if (Number.isFinite(explicitMs) && explicitMs > 0) return explicitMs;

  const legacySeconds = Number(process.env.THROTTLE_TTL);
  if (Number.isFinite(legacySeconds) && legacySeconds > 0) {
    // Anything at or above 1000 was already written in milliseconds.
    return legacySeconds >= 1000 ? legacySeconds : legacySeconds * 1000;
  }

  return DEFAULT_THROTTLE_TTL_MS;
};

const positiveOr = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Per-window budget for credential routes. THROTTLE_LIMIT has always meant this. */
export const resolveStrictThrottleLimit = (): number =>
  positiveOr(process.env.THROTTLE_LIMIT, DEFAULT_STRICT_THROTTLE_LIMIT);

/** Per-window budget for everything else. */
export const resolveGlobalThrottleLimit = (): number =>
  positiveOr(process.env.THROTTLE_GLOBAL_LIMIT, DEFAULT_GLOBAL_THROTTLE_LIMIT);

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
    // The window between passing the password check and entering a code.
    // Long enough to fetch a phone, short enough that a leaked challenge is
    // worthless by the time anyone could use it. Defaulted rather than
    // required so an unset env cannot silently mint a non-expiring token.
    twoFactorChallengeExpiresIn:
      process.env.JWT_TWO_FACTOR_CHALLENGE_EXPIRES ?? '5m',
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
    support: process.env.SUPPORT_EMAIL,
  },

  throttle: {
    // @nestjs/throttler v5+ takes `ttl` in MILLISECONDS. The historical
    // THROTTLE_TTL was written in seconds ("60"), which silently produced a
    // 60ms window — i.e. no rate limiting at all. Prefer the explicit
    // THROTTLE_TTL_MS; fall back to the legacy seconds value so existing
    // deployments keep working without an env change.
    ttl: resolveThrottleTtlMs(),
    // The global guard runs on every route, so it cannot use the strict
    // credential budget — 5 requests/minute would make the app unusable.
    limit: resolveGlobalThrottleLimit(),
    strictLimit: resolveStrictThrottleLimit(),
  },

  storage: {
    // 'local' keeps files on the container filesystem (the historical
    // behaviour). 's3' targets any S3-compatible bucket: AWS S3, Cloudflare R2,
    // Backblaze B2 or MinIO. Defaults to local so the switch is opt-in and a
    // rollback is one environment variable.
    driver: process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local',
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      // Required for R2/MinIO/B2; omit for AWS S3.
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      // CDN or public bucket domain used for world-readable objects. Without
      // it, public files fall back to presigned URLs — functional, but neither
      // cacheable nor stable.
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || undefined,
      signedUrlExpirySeconds: Number(
        process.env.S3_SIGNED_URL_EXPIRY_SECONDS ?? 900,
      ),
    },
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

    /**
     * Per-tier provider settings. Tasks pick a tier through AI_TASK_TIER
     * rather than reading one global model name, so the cheap, high-volume
     * work (bio refinement, match explanations) stops paying gpt-4o rates.
     *
     * The fast tier falls back to the quality tier's credentials, so the
     * saving lands with no new environment variables. Setting the
     * OPENAI_FAST_* trio points it at any OpenAI-compatible endpoint —
     * Groq, Together, Fireworks — without a code change.
     *
     * `baseUrl: undefined` means the SDK's own default (api.openai.com).
     */
    tiers: {
      quality: {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_MODEL ?? 'gpt-4o',
      },
      fast: {
        apiKey: process.env.OPENAI_FAST_API_KEY ?? process.env.OPENAI_API_KEY,
        baseUrl:
          process.env.OPENAI_FAST_BASE_URL ?? process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_FAST_MODEL ?? 'gpt-4o-mini',
      },
    },
  },

  ai: {
    rateLimit: Number(process.env.AI_RATE_LIMIT) || 10,
    rateLimitWindowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60000,
    dailyQuota: Number(process.env.AI_DAILY_QUOTA) || 100,
    // Per-action daily caps, applied on top of the global daily quota.
    // CV generation is the most expensive AI call on the platform.
    cvDailyQuota: Number(process.env.AI_CV_DAILY_QUOTA) || 3,
  },

  firebase: {
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT,
  },
});
