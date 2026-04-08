import { Catch, ArgumentsHost, RpcExceptionFilter } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class GlobalRpcExceptionFilter implements RpcExceptionFilter<any> {
  catch(exception: any, host: ArgumentsHost): Observable<any> {
    const errorResponse = {
      status: 'error',
      message:
        exception instanceof RpcException
          ? exception.getError()
          : exception.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    };
    return throwError(() => errorResponse);
  }
}
