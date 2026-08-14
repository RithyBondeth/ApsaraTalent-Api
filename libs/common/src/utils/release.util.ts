/**
 * The single definition of "which build is this process running".
 *
 * Three sources, in priority order:
 *
 * 1. `SENTRY_RELEASE` — passed explicitly by the deploy workflow. Authoritative,
 *    because it is the only value CI controls and therefore the only one it can
 *    assert against after a release.
 * 2. `RAILWAY_GIT_COMMIT_SHA` — injected by Railway, but ONLY for git-triggered
 *    builds. `railway up` (how CI deploys) does not set it.
 * 3. `GITHUB_SHA` — present when a process runs inside GitHub Actions.
 *
 * The order is load-bearing. `health.controller.ts` used to prefer
 * `RAILWAY_GIT_COMMIT_SHA` while `sentry/instrument.ts` preferred
 * `SENTRY_RELEASE`, so on any deploy where both were set `/health/live` and
 * Sentry would disagree about what was running — the two places you look first
 * during an incident. Both now resolve through here.
 */
export const UNKNOWN_RELEASE = 'unknown';

const RELEASE_ENV_VARS = [
  'SENTRY_RELEASE',
  'RAILWAY_GIT_COMMIT_SHA',
  'GITHUB_SHA',
] as const;

/**
 * The current release, or `undefined` when no source is set. Callers that must
 * always render a value should use {@link resolveReleaseLabel}.
 */
export function resolveRelease(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  for (const name of RELEASE_ENV_VARS) {
    // Empty and whitespace-only are treated as unset: a Dockerfile
    // `ENV SENTRY_RELEASE=${SENTRY_RELEASE}` with no build arg bakes in an
    // empty string, which must fall through rather than win.
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** The current release, or `"unknown"` when no source is set. */
export function resolveReleaseLabel(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return resolveRelease(env) ?? UNKNOWN_RELEASE;
}
