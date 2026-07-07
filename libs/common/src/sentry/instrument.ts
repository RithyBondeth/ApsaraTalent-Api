// Load .env before reading SENTRY_DSN below — this file runs before Nest's
// ConfigModule, so without this a DSN set only in .env (local dev) is never
// seen. No-op in production, where env vars are real and no .env file exists.
// dotenv never overrides variables already present in the environment.
import 'dotenv/config';
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
    // SENTRY_DEBUG=true logs SDK activity (init, envelope sends) to stdout —
    // use it to verify events are actually delivered.
    debug: process.env.SENTRY_DEBUG === 'true',
    serverName: service,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
    ...(service ? { initialScope: { tags: { service } } } : {}),
  });
}
