import * as Sentry from '@sentry/nestjs';

/**
 * Shared Sentry initialization for every process (gateway + each microservice).
 *
 * MUST be imported as the very first import in a service's `main.ts` (before any
 * other module) so Sentry can instrument the HTTP layer / dependencies before
 * they load. Import the file for its side effect:
 *
 *   import '@app/common/sentry/instrument';
 *
 * Disabled automatically when SENTRY_DSN is unset, so local/dev runs send
 * nothing and this becomes a no-op.
 */
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  // On Railway each service is its own deployment; RAILWAY_SERVICE_NAME lets
  // Sentry attribute events to the right service with zero extra config.
  const service =
    process.env.RAILWAY_SERVICE_NAME || process.env.SENTRY_SERVICE;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    serverName: service,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
    ...(service ? { initialScope: { tags: { service } } } : {}),
  });
}
