import { NestFactory } from '@nestjs/core';
import { isCsrfSafeRequest, isOriginAllowed } from '@app/common';
import { SwaggerModule } from '@nestjs/swagger';
import session from 'express-session';

jest.mock('@app/common/sentry/instrument', () => ({}));
jest.mock('./api-gateway.module', () => ({ ApiGatewayModule: class {} }));
jest.mock('./utils/rpc-to-http-exception.filter', () => ({
  RpcToHttpExceptionFilter: class {},
}));
jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
}));
jest.mock('@app/common', () => ({
  isOriginAllowed: jest.fn(),
  isCsrfSafeRequest: jest.fn(),
  parseAllowedOrigins: jest.fn(() => ['https://app.example.com']),
  PUBLIC_STORAGE_FOLDERS: ['avatars', 'company-covers'],
}));
jest.mock('@nestjs/platform-socket.io', () => ({
  IoAdapter: class {
    constructor(public app: unknown) {}
  },
}));
jest.mock('@nestjs/swagger', () => {
  class DocumentBuilder {
    setTitle() {
      return this;
    }
    setDescription() {
      return this;
    }
    setVersion() {
      return this;
    }
    addBearerAuth() {
      return this;
    }
    build() {
      return { title: 'API' };
    }
  }
  return {
    DocumentBuilder,
    SwaggerModule: {
      createDocument: jest.fn(() => ({ openapi: '3.0.0' })),
      setup: jest.fn(),
    },
  };
});
jest.mock('helmet', () => ({
  __esModule: true,
  default: jest.fn(
    () => (_req: unknown, _res: unknown, next: () => void) => next(),
  ),
}));
jest.mock('compression', () => ({
  __esModule: true,
  default: jest.fn(
    () => (_req: unknown, _res: unknown, next: () => void) => next(),
  ),
}));
jest.mock('cookie-parser', () => ({
  __esModule: true,
  default: jest.fn(
    () => (_req: unknown, _res: unknown, next: () => void) => next(),
  ),
}));
jest.mock('express-session', () => ({
  __esModule: true,
  default: jest.fn(
    () => (_req: unknown, _res: unknown, next: () => void) => next(),
  ),
}));
jest.mock('passport', () => ({
  __esModule: true,
  default: { initialize: jest.fn(() => jest.fn()) },
}));

describe('API gateway startup wiring', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('registers security, CORS, public storage, Swagger, and listeners', async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3456';
    process.env.CORS_ALLOW_ALL = 'false';
    const logger = { log: jest.fn() };
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'frontend.origin') return 'https://app.example.com';
        if (key === 'session.secret') return 'secret';
        if (key === 'storage.driver') return 'local';
        return undefined;
      }),
    };
    const app = {
      get: jest.fn((token: any) =>
        token?.name === 'ConfigService' ? config : logger,
      ),
      set: jest.fn(),
      useGlobalFilters: jest.fn(),
      useGlobalPipes: jest.fn(),
      use: jest.fn(),
      enableCors: jest.fn(),
      useWebSocketAdapter: jest.fn(),
      useStaticAssets: jest.fn(),
      useLogger: jest.fn(),
      startAllMicroservices: jest.fn().mockResolvedValue(undefined),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);
    (isCsrfSafeRequest as jest.Mock).mockReturnValue(true);
    (isOriginAllowed as jest.Mock).mockImplementation(
      (origin) => origin === 'https://app.example.com',
    );

    await jest.isolateModulesAsync(async () => {
      await import('./main');
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(app.useGlobalFilters).toHaveBeenCalledTimes(1);
    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(app.useWebSocketAdapter).toHaveBeenCalledTimes(1);
    expect(app.useStaticAssets).toHaveBeenCalledTimes(2);
    expect(app.listen).toHaveBeenCalledWith(3456);

    const cors = app.enableCors.mock.calls[0][0];
    const allowed = jest.fn();
    cors.origin('https://app.example.com', allowed);
    expect(allowed).toHaveBeenCalledWith(null, true);
    const denied = jest.fn();
    cors.origin('https://evil.example.com', denied);
    expect(denied).toHaveBeenCalledWith(expect.any(Error), false);

    const staticOptions = app.useStaticAssets.mock.calls[0][1];
    const response = { setHeader: jest.fn() };
    staticOptions.setHeaders(response);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cross-Origin-Resource-Policy',
      'cross-origin',
    );

    (isCsrfSafeRequest as jest.Mock).mockReturnValueOnce(false);
    const csrfMiddleware = app.use.mock.calls[3][0];
    const next = jest.fn();
    csrfMiddleware({}, {}, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('uses production-safe cookies, object storage, hidden docs, and configured port', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.PORT;
    delete process.env.ENABLE_SWAGGER;
    process.env.CORS_ALLOW_ALL = 'true';
    const logger = { log: jest.fn() };
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'frontend.origin') return 'https://app.example.com';
        if (key === 'session.secret') return 'production-secret';
        if (key === 'storage.driver') return 's3';
        if (key === 'services.apiGateway.port') return 4567;
        return undefined;
      }),
    };
    const app = {
      get: jest.fn((token: any) =>
        token?.name === 'ConfigService' ? config : logger,
      ),
      set: jest.fn(),
      useGlobalFilters: jest.fn(),
      useGlobalPipes: jest.fn(),
      use: jest.fn(),
      enableCors: jest.fn(),
      useWebSocketAdapter: jest.fn(),
      useStaticAssets: jest.fn(),
      useLogger: jest.fn(),
      startAllMicroservices: jest.fn().mockResolvedValue(undefined),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);
    (isCsrfSafeRequest as jest.Mock).mockReturnValue(true);

    let mainModule: typeof import('./main');
    await jest.isolateModulesAsync(async () => {
      mainModule = await import('./main');
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(session).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: 'production-secret',
        cookie: expect.objectContaining({ secure: true }),
      }),
    );
    expect(app.useStaticAssets).not.toHaveBeenCalled();
    expect(SwaggerModule.setup).not.toHaveBeenCalled();
    expect(app.listen).toHaveBeenCalledWith(4567);

    const cors = app.enableCors.mock.calls[0][0];
    const allow = jest.fn();
    cors.origin('https://otherwise-denied.example', allow);
    expect(allow).toHaveBeenCalledWith(null, true);

    expect(() => mainModule!.resolveSessionSecret(undefined, true)).toThrow(
      'SESSION_SECRET is required in production',
    );
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    expect(mainModule!.resolveSessionSecret(undefined, false)).toBe(
      'insecure-development-secret',
    );
    expect(warn).toHaveBeenCalled();
  });
});
