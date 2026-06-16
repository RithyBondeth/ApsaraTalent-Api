import {
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  ExceptionFilter,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

// Catch-all filter used by every microservice. Since services are now hybrid
// apps (TCP microservice + an HTTP server for /metrics), it must handle both
// contexts: RPC errors are re-thrown as an observable; HTTP errors get a normal
// JSON response instead of being turned into an (invalid) observable.
@Catch()
export class GlobalRpcExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost): Observable<any> | void {
    const error = this.normalize(exception);
    if (host.getType() === 'http') {
      const res = host.switchToHttp().getResponse();
      res.status(error.statusCode).json(error);
      return;
    }
    return throwError(() => error);
  }

  private normalize(exception: unknown): {
    statusCode: number;
    message: string;
  } {
    if (exception instanceof RpcException) {
      const err = exception.getError();
      if (typeof err === 'string') {
        return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: err };
      }
      if (typeof err === 'object' && err !== null) {
        const payload = err as Record<string, unknown>;
        const statusCode =
          typeof payload.statusCode === 'number'
            ? payload.statusCode
            : HttpStatus.INTERNAL_SERVER_ERROR;
        const message =
          typeof payload.message === 'string'
            ? payload.message
            : Array.isArray(payload.message)
              ? (payload.message as string[]).join(', ')
              : 'Internal server error';
        return { statusCode, message };
      }
    }

    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      const message =
        typeof resp === 'string'
          ? resp
          : Array.isArray((resp as any)?.message)
            ? ((resp as any).message as string[]).join(', ')
            : ((resp as any)?.message ?? exception.message);
      return { statusCode: exception.getStatus(), message };
    }

    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message || 'Internal server error',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
