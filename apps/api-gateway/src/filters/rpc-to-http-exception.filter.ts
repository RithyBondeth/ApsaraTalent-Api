import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Global exception filter for the API Gateway.
 *
 * When a microservice call fails, `firstValueFrom()` throws the raw error
 * object returned by the service's RpcExceptionFilter. This filter
 * normalizes those errors into proper HTTP responses so the gateway
 * never returns an unintentional 500.
 */
@Catch()
export class RpcToHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcToHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // NestJS HTTP exceptions pass through unchanged.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(
        typeof body === 'string' ? { statusCode: status, message: body } : body,
      );
      return;
    }

    const { statusCode, message } = this.normalize(exception);
    this.logger.error(`[RPC Error] ${statusCode}: ${message}`);
    response.status(statusCode).json({ statusCode, message });
  }

  private normalize(exception: unknown): { statusCode: number; message: string } {
    const fallback = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };

    if (!exception || typeof exception !== 'object') {
      return typeof exception === 'string'
        ? { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: exception }
        : fallback;
    }

    const err = exception as Record<string, unknown>;

    // Walk candidate locations where statusCode/message may be nested.
    const candidates = [err, err['response'], err['error'], err['cause']];

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue;
      const payload = candidate as Record<string, unknown>;
      const rawStatus = payload['statusCode'];
      const rawMessage = payload['message'];

      const statusCode =
        typeof rawStatus === 'number' && rawStatus >= 100 && rawStatus <= 599
          ? rawStatus
          : null;

      const message =
        typeof rawMessage === 'string'
          ? rawMessage
          : Array.isArray(rawMessage)
            ? (rawMessage as string[]).join(', ')
            : null;

      if (statusCode || message) {
        return {
          statusCode: statusCode ?? fallback.statusCode,
          message: message ?? fallback.message,
        };
      }
    }

    // Last resort: try parsing a JSON-encoded message string.
    if (typeof err['message'] === 'string') {
      try {
        const parsed = JSON.parse(err['message']) as Record<string, unknown>;
        if (
          typeof parsed['statusCode'] === 'number' &&
          typeof parsed['message'] === 'string'
        ) {
          return { statusCode: parsed['statusCode'], message: parsed['message'] };
        }
      } catch {
        return { statusCode: fallback.statusCode, message: err['message'] };
      }
    }

    return fallback;
  }
}
