import { NestFactory } from '@nestjs/core';

jest.mock('@app/common/sentry/instrument', () => ({}));
jest.mock('./payment-service.module', () => ({
  PaymentServiceModule: class {},
}));
jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
}));

describe('payment service startup wiring', () => {
  it('connects RPC, metrics HTTP, validation, filtering, and logging', async () => {
    const logger = { log: jest.fn() };
    const config = {
      get: jest.fn((key: string) =>
        key.endsWith('metricsPort') ? 9106 : 3016,
      ),
    };
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

    await jest.isolateModulesAsync(async () => {
      await import('./main');
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(app.connectMicroservice).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { host: '0.0.0.0', port: 3016 },
      }),
      { inheritAppConfig: true },
    );
    expect(app.useGlobalFilters).toHaveBeenCalledTimes(1);
    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(app.useLogger).toHaveBeenCalledWith(logger);
    expect(app.startAllMicroservices).toHaveBeenCalled();
    expect(app.listen).toHaveBeenCalledWith(9106);
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Payment service running'),
    );
  });
});
