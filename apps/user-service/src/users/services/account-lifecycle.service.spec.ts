import { RpcException } from '@nestjs/microservices';
import {
  AccountLifecycleService,
  DELETION_GRACE_PERIOD_MS,
} from './account-lifecycle.service';

describe('AccountLifecycleService', () => {
  const userRepo = { findOne: jest.fn(), update: jest.fn() };
  const applicationRepo = { find: jest.fn().mockResolvedValue([]) };
  const interviewRepo = { find: jest.fn().mockResolvedValue([]) };
  const matchingRepo = { find: jest.fn().mockResolvedValue([]) };
  const employeeFavoritesRepo = { find: jest.fn().mockResolvedValue([]) };
  const companyFavoritesRepo = { find: jest.fn().mockResolvedValue([]) };
  const notificationRepo = { find: jest.fn().mockResolvedValue([]) };
  const notificationPreferenceRepo = { findOne: jest.fn() };
  const problemReportRepo = { find: jest.fn().mockResolvedValue([]) };
  const loginHistoryRepo = { find: jest.fn().mockResolvedValue([]) };
  const redisService = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  const analytics = { capture: jest.fn(), identify: jest.fn() };
  const logger = { setContext: jest.fn(), error: jest.fn() };

  const service = new AccountLifecycleService(
    userRepo as any,
    applicationRepo as any,
    interviewRepo as any,
    matchingRepo as any,
    employeeFavoritesRepo as any,
    companyFavoritesRepo as any,
    notificationRepo as any,
    notificationPreferenceRepo as any,
    problemReportRepo as any,
    loginHistoryRepo as any,
    redisService as any,
    analytics as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redisService.get.mockResolvedValue(null);
    notificationPreferenceRepo.findOne.mockResolvedValue(null);
  });

  describe('requestDeletion', () => {
    it('marks the account and reports the grace-window end date', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u-1', deletedAt: null });

      const before = Date.now();
      const result = await service.requestDeletion({ userId: 'u-1' });
      const after = Date.now();

      expect(userRepo.update).toHaveBeenCalledWith(
        { id: 'u-1' },
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );

      const scheduledFor = new Date(result.scheduledFor).getTime();
      // Exactly the grace window from now, within the test's own tick.
      expect(scheduledFor).toBeGreaterThanOrEqual(
        before + DELETION_GRACE_PERIOD_MS,
      );
      expect(scheduledFor).toBeLessThanOrEqual(
        after + DELETION_GRACE_PERIOD_MS,
      );
    });

    it('is idempotent — a second request keeps the original scheduled date', async () => {
      const originalRequestedAt = new Date('2026-08-01T00:00:00.000Z');
      userRepo.findOne.mockResolvedValue({
        id: 'u-1',
        deletedAt: originalRequestedAt,
      });

      const result = await service.requestDeletion({ userId: 'u-1' });

      // A nervous double-click must not silently push the timer out.
      expect(userRepo.update).not.toHaveBeenCalled();
      expect(result.scheduledFor).toBe(
        new Date(
          originalRequestedAt.getTime() + DELETION_GRACE_PERIOD_MS,
        ).toISOString(),
      );
    });

    it('wipes the current-user cache so the banner appears on the next paint', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u-1', deletedAt: null });

      await service.requestDeletion({ userId: 'u-1' });

      expect(redisService.del).toHaveBeenCalled();
    });

    it('rejects with a 404 when the account does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.requestDeletion({ userId: 'u-1' }),
      ).rejects.toBeInstanceOf(RpcException);
    });
  });

  describe('cancelDeletion', () => {
    it('clears deletedAt and busts the cache', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u-1',
        deletedAt: new Date(),
      });

      const result = await service.cancelDeletion({ userId: 'u-1' });

      expect(userRepo.update).toHaveBeenCalledWith(
        { id: 'u-1' },
        { deletedAt: null },
      );
      expect(redisService.del).toHaveBeenCalled();
      expect(result.message).toMatch(/cancelled/i);
    });

    it('is a no-op when nothing is pending', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u-1', deletedAt: null });

      await service.cancelDeletion({ userId: 'u-1' });

      expect(userRepo.update).not.toHaveBeenCalled();
      expect(redisService.del).not.toHaveBeenCalled();
    });
  });

  describe('exportData', () => {
    const activeUser = () => ({
      id: 'u-1',
      email: 'me@example.com',
      role: 'employee',
      password: 'BCRYPT_HASH',
      refreshToken: 'REFRESH_TOKEN',
      twoFactorSecret: 'TFA_SECRET',
      resetPasswordToken: 'RESET_TOKEN',
      otpCode: 'OTP',
      emailVerificationOtp: 'EMAIL_OTP',
      employee: { id: 'e-1', firstname: 'Sok' },
      company: null,
    });

    it('never puts credential material into the download', async () => {
      userRepo.findOne.mockResolvedValue(activeUser());

      const dump = await service.exportData({ userId: 'u-1' });

      const serialized = JSON.stringify(dump);
      // Even the account owner should never see any of these in a portable
      // data export — password/refresh/2FA/reset are credentials, and OTP
      // codes are one-shot bearers.
      expect(serialized).not.toContain('BCRYPT_HASH');
      expect(serialized).not.toContain('REFRESH_TOKEN');
      expect(serialized).not.toContain('TFA_SECRET');
      expect(serialized).not.toContain('RESET_TOKEN');
      expect(serialized).not.toContain('OTP');
    });

    it('gathers every collection the account owns', async () => {
      userRepo.findOne.mockResolvedValue(activeUser());
      applicationRepo.find.mockResolvedValue([{ id: 'a-1' }]);
      notificationRepo.find.mockResolvedValue([{ id: 'n-1' }]);
      problemReportRepo.find.mockResolvedValue([{ id: 'p-1' }]);
      loginHistoryRepo.find.mockResolvedValue([{ id: 'l-1' }]);

      const dump = await service.exportData({ userId: 'u-1' });

      expect(dump.applications).toHaveLength(1);
      expect(dump.notifications).toHaveLength(1);
      expect(dump.problemReports).toHaveLength(1);
      expect(dump.loginHistory).toHaveLength(1);
      expect(dump.user.email).toBe('me@example.com');
    });

    it('refuses when the same user asks again within the cooldown', async () => {
      redisService.get.mockResolvedValue(Date.now() - 60_000);

      // A user hammering the export is a full scan on a dozen tables — the
      // rate limit is a small mercy for the database.
      await expect(
        service.exportData({ userId: 'u-1' }),
      ).rejects.toBeInstanceOf(RpcException);
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });

    it('records the cooldown after a successful export', async () => {
      userRepo.findOne.mockResolvedValue(activeUser());

      await service.exportData({ userId: 'u-1' });

      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining('u-1'),
        expect.any(Number),
        expect.any(Number),
      );
    });
  });
});
