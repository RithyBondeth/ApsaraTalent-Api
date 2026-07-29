import 'reflect-metadata';
import { AiQuotaController } from './ai-quota.controller';

describe('AiQuotaController', () => {
  it('reads usage for the authenticated user without consuming quota', async () => {
    const quota = {
      getUsage: jest.fn().mockResolvedValue({ used: 2, limit: 5 }),
    };
    const controller = new AiQuotaController(quota as any);
    await expect(
      controller.getQuota({ user: { id: 'user-1' } }),
    ).resolves.toEqual({ used: 2, limit: 5 });
    expect(quota.getUsage).toHaveBeenCalledWith('user-1');
  });
});
