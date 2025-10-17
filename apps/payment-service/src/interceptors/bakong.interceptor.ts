import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, Observable, tap } from 'rxjs';

@Injectable()
export class BakongLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(BakongLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const startTime = Date.now();
    // Log request (be careful not to log sensitive data)
    this.logger.log(
      `Bakong Request: ${method} ${url} - ${JSON.stringify(this.sanitizeRequestData(body))}`,
    );

    return next.handle().pipe(
      tap((response) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        this.logger.log(
          `Bakong Response: ${method} ${url} - ${duration}ms - Success: ${response?.success || 'unknown'}`,
        );
      }),
      catchError((error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        this.logger.error(
          `Bakong Error: ${method} ${url} - ${duration}ms - Error: ${error.message}`,
        );
        throw error;
      }),
    );
  }

  private sanitizeRequestData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };

    // Remove or mask sensitive fields
    const sensitiveFields = ['developerToken', 'apiKey', 'secret'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***masked***';
      }
    });

    // Truncate long QR strings for logging
    if (sanitized.qrString && sanitized.qrString.length > 50) {
      sanitized.qrString = sanitized.qrString.substring(0, 50) + '...';
    }

    return sanitized;
  }
}
