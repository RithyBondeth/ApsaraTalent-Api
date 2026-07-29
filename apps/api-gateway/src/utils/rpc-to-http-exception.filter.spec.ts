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

  it.each([
    [undefined, 500, 'Internal server error'],
    [42, 500, 'Internal server error'],
    [{ cause: { statusCode: 429, message: 'Slow down' } }, 429, 'Slow down'],
    [{ statusCode: 418 }, 418, 'Internal server error'],
    [{ message: ['first', 'second'] }, 500, 'first, second'],
  ])('covers additional defensive RPC shapes %#', (error, code, message) => {
    filter.catch(error, host);
    expect(json).toHaveBeenCalledWith({ statusCode: code, message });
  });

  it('parses a late JSON message after candidate locations are exhausted', () => {
    let reads = 0;
    const error = {
      get message() {
        reads += 1;
        return reads === 1
          ? 123
          : JSON.stringify({ statusCode: 409, message: 'Late conflict' });
      },
    };

    filter.catch(error, host);

    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      message: 'Late conflict',
    });
  });

  it('returns the original late message when it is not JSON', () => {
    let reads = 0;
    const error = {
      get message() {
        reads += 1;
        return reads === 1 ? 123 : 'late plain failure';
      },
    };

    filter.catch(error, host);

    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'late plain failure',
    });
  });

  it('falls back when late JSON has an invalid response shape', () => {
    let reads = 0;
    const error = {
      get message() {
        reads += 1;
        return reads === 1
          ? 123
          : JSON.stringify({ statusCode: 'bad', message: 42 });
      },
    };

    filter.catch(error, host);

    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});
