import type { ErrorEvent } from '@sentry/nestjs';

type UnknownRecord = Record<string, unknown>;

const SENSITIVE_KEY =
  /^(authorization|cookie|set-cookie|password|passcode|secret|token|access_token|refresh_token|api[_-]?key|session)$/i;

export function parseSentrySampleRate(
  raw: string | undefined,
  fallback = 0.1,
): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as UnknownRecord).map(([key, nested]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[Filtered]' : redact(nested),
    ]),
  );
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  const requestRecord = event.request as unknown as UnknownRecord | undefined;
  const userRecord = event.user as unknown as UnknownRecord | undefined;
  const request = event.request
    ? {
        ...event.request,
        cookies: undefined,
        headers: redact(requestRecord?.headers),
        data: redact(requestRecord?.data),
      }
    : undefined;
  const user = event.user
    ? { id: userRecord?.id, role: userRecord?.role }
    : undefined;

  return {
    ...event,
    ...(request ? { request } : {}),
    ...(user ? { user } : {}),
    ...(event.extra ? { extra: redact(event.extra) as UnknownRecord } : {}),
    ...(event.contexts
      ? { contexts: redact(event.contexts) as UnknownRecord }
      : {}),
    ...(event.breadcrumbs
      ? {
          breadcrumbs: event.breadcrumbs.map((breadcrumb) => ({
            ...breadcrumb,
            data: redact(breadcrumb.data) as UnknownRecord,
          })),
        }
      : {}),
  } as ErrorEvent;
}
