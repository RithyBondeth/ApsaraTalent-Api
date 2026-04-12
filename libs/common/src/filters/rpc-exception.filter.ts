import {
  Catch,
  ArgumentsHost,
  HttpStatus,
  RpcExceptionFilter,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class GlobalRpcExceptionFilter implements RpcExceptionFilter<any> {
  catch(exception: any, host: ArgumentsHost): Observable<any> {
    const error = this.normalize(exception);
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
