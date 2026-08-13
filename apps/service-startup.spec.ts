import { NestFactory } from '@nestjs/core';

jest.mock('@app/common/sentry/instrument', () => ({}));
jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
}));

// Each main.ts imports from the '@app/common' barrel, which evaluates
// LoggerModule -> PinoLoggerModule.forRoot({ transport: { targets: [...] } }).
// Pino builds that transport in a worker thread that keeps loading modules in
// the background; once the test ends, those loads land after Jest has torn the
// environment down and fail the suite. Nothing here needs a real logger — the
// mocked app returns a stub from app.get(Logger) — so stub the module out.
jest.mock('nestjs-pino', () => ({
  Logger: class Logger {},
  PinoLogger: class PinoLogger {},
  LoggerModule: { forRoot: () => ({ module: class PinoLoggerModuleStub {} }) },
  InjectPinoLogger: () => () => undefined,
  getLoggerToken: (name: string) => `PinoLogger:${name}`,
}));

// Every service main.ts takes exactly one symbol from the '@app/common'
// barrel, but importing it drags in storage (AWS SDK), the database entities
// and redis. Those keep resolving modules in the background after the test
// finishes, which trips the same "imported after teardown" failure. This spec
// only checks bootstrap wiring, so the filter can be a stub.
jest.mock('@app/common', () => ({
  GlobalRpcExceptionFilter: class GlobalRpcExceptionFilter {},
}));
jest.mock('./auth-service/src/auth-service.module', () => ({
  AuthServiceModule: class {},
}));
jest.mock('./user-service/src/user-service.module', () => ({
  UserServiceModule: class {},
}));
jest.mock('./resume-builder-service/src/resume-builder-service.module', () => ({
  ResumeBuilderServiceModule: class {},
}));
jest.mock('./chat-service/src/chat-service.module', () => ({
  ChatServiceModule: class {},
}));
jest.mock('./job-service/src/job-service.module', () => ({
  JobServiceModule: class {},
}));
jest.mock('./notification-service/src/notification-service.module', () => ({
  NotificationServiceModule: class {},
}));

describe('microservice startup wiring', () => {
  it('starts every RPC service with its metrics listener', async () => {
    const logger = { log: jest.fn() };
    const ports: Record<string, number> = {
      'services.auth.port': 3001,
      'services.auth.metricsPort': 9101,
      'services.user.port': 3002,
      'services.user.metricsPort': 9102,
      'services.resume.port': 3003,
      'services.resume.metricsPort': 9103,
      'services.chat.port': 3004,
      'services.chat.metricsPort': 9104,
      'services.job.port': 3005,
      'services.job.metricsPort': 9105,
      'services.notification.port': 3007,
      'services.notification.metricsPort': 9107,
    };
    const config = { get: jest.fn((key: string) => ports[key]) };
    const app = {
      get: jest.fn((token: any) =>
        token?.name === 'ConfigService' ? config : logger,
      ),
      connectMicroservice: jest.fn(),
      enableShutdownHooks: jest.fn(),
      useGlobalFilters: jest.fn(),
      useGlobalPipes: jest.fn(),
      useLogger: jest.fn(),
      startAllMicroservices: jest.fn().mockResolvedValue(undefined),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);

    const mains = [
      './auth-service/src/main',
      './user-service/src/main',
      './resume-builder-service/src/main',
      './chat-service/src/main',
      './job-service/src/main',
      './notification-service/src/main',
    ];

    // Each main.ts ends in a bare `bootstrap()` — a floating promise the import
    // does not await. Waiting a fixed number of ticks is a race: under parallel
    // workers bootstrap can still be running when the test ends, and its next
    // lazy import then throws "imported after the Jest environment was torn
    // down". `logger.log` is bootstrap's last statement, so wait for that.
    for (const [index, main] of mains.entries()) {
      await import(main);
      const expected = index + 1;
      for (let tick = 0; tick < 1000; tick++) {
        if (logger.log.mock.calls.length >= expected) break;
        await new Promise((resolve) => setImmediate(resolve));
      }
      expect(logger.log).toHaveBeenCalledTimes(expected);
    }

    expect(NestFactory.create).toHaveBeenCalledTimes(6);
    expect(app.connectMicroservice).toHaveBeenCalledTimes(6);
    expect(app.enableShutdownHooks).toHaveBeenCalledTimes(6);
    expect(app.useGlobalFilters).toHaveBeenCalledTimes(6);
    expect(app.useGlobalPipes).toHaveBeenCalledTimes(6);
    expect(app.startAllMicroservices).toHaveBeenCalledTimes(6);
    expect(app.listen.mock.calls.map(([port]) => port)).toEqual([
      9101, 9102, 9103, 9104, 9105, 9107,
    ]);
    expect(logger.log).toHaveBeenCalledTimes(6);
  });
});
