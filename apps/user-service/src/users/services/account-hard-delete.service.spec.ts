import { In, LessThan } from 'typeorm';
import { AccountHardDeleteService } from './account-hard-delete.service';
import { DELETION_GRACE_PERIOD_MS } from './account-lifecycle.service';

describe('AccountHardDeleteService', () => {
  const userRepo = { find: jest.fn(), delete: jest.fn() };
  const loginHistoryRepo = { delete: jest.fn() };
  const logger = { setContext: jest.fn(), info: jest.fn(), error: jest.fn() };

  const service = new AccountHardDeleteService(
    userRepo as any,
    loginHistoryRepo as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo.delete.mockResolvedValue({ affected: 0 });
    loginHistoryRepo.delete.mockResolvedValue({ affected: 0 });
  });

  it('deletes login history first, then the user rows', async () => {
    userRepo.find.mockResolvedValue([{ id: 'u-1' }, { id: 'u-2' }]);

    await service.purgePastGrace();

    // Login history has no FK to user (its uuid column is unconstrained so it
    // outlives its owner for audit reasons) — the cascade on the user row
    // does not touch it. Personal data (IPs, user agents) still has to go.
    const loginOrder = loginHistoryRepo.delete.mock.invocationCallOrder[0];
    const userOrder = userRepo.delete.mock.invocationCallOrder[0];
    expect(loginOrder).toBeLessThan(userOrder);

    expect(loginHistoryRepo.delete).toHaveBeenCalledWith(
      expect.objectContaining({ userId: expect.any(Object) }),
    );
    expect(userRepo.delete).toHaveBeenCalledWith({ id: In(['u-1', 'u-2']) });
  });

  it('picks users whose grace window has expired', async () => {
    userRepo.find.mockResolvedValue([]);

    await service.purgePastGrace();

    const [whereArgs] = userRepo.find.mock.calls[0];
    expect(whereArgs.where.deletedAt).toEqual(expect.any(Object));
    // Cutoff is now minus the grace window; testing the value directly would
    // be flaky, so we check the operator shape and that the batch is bounded.
    expect(whereArgs.take).toBeGreaterThan(0);
    expect(whereArgs.take).toBeLessThanOrEqual(100);

    // Sanity — the operator instance is a LessThan of a date within the grace
    // period below now.
    const operator = whereArgs.where.deletedAt;
    expect(operator instanceof (LessThan(new Date()) as any).constructor).toBe(
      true,
    );
    const cutoffValue = operator.value.getTime();
    expect(Date.now() - cutoffValue).toBeGreaterThanOrEqual(
      DELETION_GRACE_PERIOD_MS - 1000,
    );
  });

  it('is a no-op tick when nothing is due', async () => {
    userRepo.find.mockResolvedValue([]);

    await service.purgePastGrace();

    expect(loginHistoryRepo.delete).not.toHaveBeenCalled();
    expect(userRepo.delete).not.toHaveBeenCalled();
  });

  it('survives a database failure — next tick tries again', async () => {
    userRepo.find.mockRejectedValue(new Error('database unavailable'));

    await expect(service.purgePastGrace()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
