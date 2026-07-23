import { HttpException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { RpcToHttpExceptionFilter } from './rpc-to-http-exception.filter';

jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));

describe('RpcToHttpExceptionFilter', () => {
  const status = jest.fn();
  const json = jest.fn();
  const response = { status, json };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as any;
  const filter = new RpcToHttpExceptionFilter();

  beforeEach(() => {
    jest.clearAllMocks();
    status.mockReturnValue(response);
  });

  it('passes through structured HTTP client errors without reporting them', () => {
    filter.catch(
      new HttpException({ statusCode: 400, message: 'Bad input' }, 400),
      host,
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Bad input',
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('normalizes string HTTP exceptions and reports server errors', () => {
    const error = new HttpException('Unavailable', 503);
    filter.catch(error, host);
    expect(json).toHaveBeenCalledWith({
      statusCode: 503,
      message: 'Unavailable',
    });
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it.each([
    [{ statusCode: 404, message: 'Missing' }, 404, 'Missing'],
    [{ response: { statusCode: 409, message: 'Conflict' } }, 409, 'Conflict'],
    [{ error: { statusCode: 422, message: ['one', 'two'] } }, 422, 'one, two'],
    [
      new Error(JSON.stringify({ statusCode: 401, message: 'Denied' })),
      500,
      '{"statusCode":401,"message":"Denied"}',
    ],
    ['socket closed', 500, 'socket closed'],
    [null, 500, 'Internal server error'],
  ])('normalizes RPC error shapes', (error, code, message) => {
    filter.catch(error, host);
    expect(status).toHaveBeenCalledWith(code);
    expect(json).toHaveBeenCalledWith({ statusCode: code, message });
  });

  it('reports only normalized 5xx RPC failures', () => {
    const clientError = { statusCode: 403, message: 'Forbidden' };
    filter.catch(clientError, host);
    expect(Sentry.captureException).not.toHaveBeenCalled();

    const serverError = { statusCode: 500, message: 'Failure' };
    filter.catch(serverError, host);
    expect(Sentry.captureException).toHaveBeenCalledWith(serverError);
  });
});
