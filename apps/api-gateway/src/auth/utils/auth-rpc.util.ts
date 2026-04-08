import { HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

export function normalizeAuthServiceError(error: unknown): {
  statusCode: number;
  message: string;
} {
  const fallback = {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
  };

  if (!error || typeof error !== 'object') return fallback;

  const err = error as Record<string, unknown>;
  const candidates: unknown[] = [err, err.response, err.error, err.cause];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const payload = candidate as Record<string, unknown>;
    const rawStatus = payload.statusCode;
    const rawMessage = payload.message;
    const statusCode =
      typeof rawStatus === 'number' && rawStatus >= 100 && rawStatus <= 599
        ? rawStatus
        : null;

    const message =
      typeof rawMessage === 'string'
        ? rawMessage
        : Array.isArray(rawMessage)
          ? rawMessage.find((item) => typeof item === 'string')
          : null;

    if (statusCode || message) {
      return {
        statusCode: statusCode ?? fallback.statusCode,
        message: message ?? fallback.message,
      };
    }
  }

  if (typeof err.message === 'string') {
    try {
      const parsed = JSON.parse(err.message) as Record<string, unknown>;
      const parsedStatus = parsed.statusCode;
      const parsedMessage = parsed.message;
      if (
        typeof parsedStatus === 'number' &&
        typeof parsedMessage === 'string'
      ) {
        return { statusCode: parsedStatus, message: parsedMessage };
      }
    } catch {
      // Ignore malformed JSON and fall back to the generic error below.
    }
  }

  return fallback;
}

export function rethrowAuthServiceError(error: unknown): never {
  const normalized = normalizeAuthServiceError(error);
  throw new HttpException(normalized.message, normalized.statusCode);
}

export async function sendAuthServiceRequest<T = any>(
  authClient: ClientProxy,
  action: unknown,
  payload: unknown,
): Promise<T> {
  try {
    return await firstValueFrom(authClient.send<T>(action, payload));
  } catch (error) {
    rethrowAuthServiceError(error);
  }
}
