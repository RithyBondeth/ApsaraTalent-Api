import 'reflect-metadata';
import { TwoFactorController } from './two-factor.controller';

describe('TwoFactorController', () => {
  it('delegates setup, enable, disable, and login verification', async () => {
    const methods = [
      'twoFactorSetup',
      'twoFactorEnable',
      'twoFactorDisable',
      'twoFactorVerifyLogin',
    ];
    const service = Object.fromEntries(
      methods.map((method) => [
        method,
        jest.fn().mockResolvedValue({ success: true }),
      ]),
    ) as Record<string, jest.Mock>;
    const controller = new TwoFactorController(service as any);
    for (const method of methods) {
      const dto = { userId: 'user-1' } as any;
      await (controller as any)[method](dto);
      expect(service[method]).toHaveBeenCalledWith(dto);
    }
  });
});
