import { NestFactory } from '@nestjs/core';

jest.mock('@app/common/sentry/instrument', () => ({}));
jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
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
      useGlobalFilters: jest.fn(),
      useGlobalPipes: jest.fn(),
      useLogger: jest.fn(),
      startAllMicroservices: jest.fn().mockResolvedValue(undefined),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);

    for (const main of [
      './auth-service/src/main',
      './user-service/src/main',
      './resume-builder-service/src/main',
      './chat-service/src/main',
      './job-service/src/main',
      './notification-service/src/main',
    ]) {
      await import(main);
      await new Promise((resolve) => setImmediate(resolve));
    }

    expect(NestFactory.create).toHaveBeenCalledTimes(6);
    expect(app.connectMicroservice).toHaveBeenCalledTimes(6);
    expect(app.useGlobalFilters).toHaveBeenCalledTimes(6);
    expect(app.useGlobalPipes).toHaveBeenCalledTimes(6);
    expect(app.startAllMicroservices).toHaveBeenCalledTimes(6);
    expect(app.listen.mock.calls.map(([port]) => port)).toEqual([
      9101, 9102, 9103, 9104, 9105, 9107,
    ]);
    expect(logger.log).toHaveBeenCalledTimes(6);
  });
});
