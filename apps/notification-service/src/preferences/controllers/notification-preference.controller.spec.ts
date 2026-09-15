import 'reflect-metadata';
import { NotificationPreferenceController } from './notification-preference.controller';

describe('NotificationPreferenceController', () => {
  const preferenceService = {
    resolve: jest.fn(),
    update: jest.fn(),
    unsubscribe: jest.fn(),
  };
  const controller = new NotificationPreferenceController(
    preferenceService as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('delegates every RPC pattern to the preference service', async () => {
    await controller.getPreferences({ userId: 'u1' });
    expect(preferenceService.resolve).toHaveBeenCalledWith({ userId: 'u1' });

    await controller.updatePreferences({ userId: 'u1', emailEnabled: false });
    expect(preferenceService.update).toHaveBeenCalledWith({
      userId: 'u1',
      emailEnabled: false,
    });

    await controller.unsubscribe({ token: 'a'.repeat(48) });
    expect(preferenceService.unsubscribe).toHaveBeenCalledWith({
      token: 'a'.repeat(48),
    });
  });
});
