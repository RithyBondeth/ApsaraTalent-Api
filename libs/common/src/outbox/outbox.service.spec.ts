import { EOutboxChannel } from '../database/enums/outbox-channel.enum';
import { EOutboxStatus } from '../database/enums/outbox-status.enum';
import { OutboxService } from './outbox.service';

describe('OutboxService', () => {
  const repo = {
    create: jest.fn((values: unknown) => values),
    save: jest.fn(),
    query: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  };
  const values: Record<string, unknown> = { 'outbox.maxAttempts': 5 };
  const config = { get: jest.fn((key: string) => values[key]) };
  const logger = { setContext: jest.fn(), warn: jest.fn(), error: jest.fn() };

  const createService = () =>
    new OutboxService(repo as any, config as any, logger as any);

  beforeEach(() => {
    jest.clearAllMocks();
    repo.save.mockResolvedValue({ id: 'row-1' });
  });

  describe('enqueue', () => {
    it('writes a pending row and returns its id', async () => {
      const id = await createService().enqueue(EOutboxChannel.EMAIL, {
        to: 'person@example.com',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: EOutboxChannel.EMAIL,
          status: EOutboxStatus.PENDING,
          attempts: 0,
          maxAttempts: 5,
        }),
      );
      expect(id).toBe('row-1');
    });

    it('honours a per-message attempt budget over the configured default', async () => {
      await createService().enqueue(
        EOutboxChannel.EMAIL,
        { to: 'person@example.com' },
        { maxAttempts: 12 },
      );

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ maxAttempts: 12 }),
      );
    });

    it('returns null rather than throwing when the row cannot be written', async () => {
      repo.save.mockRejectedValue(new Error('database is down'));

      await expect(
        createService().enqueue(EOutboxChannel.EMAIL, { to: 'a@example.com' }),
      ).resolves.toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('claimBatch', () => {
    it('claims only due rows that still have attempts left', async () => {
      repo.query.mockResolvedValue([{ id: 'row-1' }]);

      const claimed = await createService().claimBatch(
        EOutboxChannel.EMAIL,
        10,
        60_000,
      );

      const [sql, params] = repo.query.mock.calls[0];
      expect(sql).toContain('FOR UPDATE SKIP LOCKED');
      expect(sql).toContain('"attempts" < "maxAttempts"');
      expect(sql).toContain('"attempts" = "attempts" + 1');
      expect(params).toEqual([
        EOutboxStatus.PROCESSING,
        60_000,
        EOutboxChannel.EMAIL,
        EOutboxStatus.PENDING,
        10,
      ]);
      expect(claimed).toEqual([{ id: 'row-1' }]);
    });
  });

  describe('markFailed', () => {
    it('returns a message with attempts remaining to pending, with backoff', async () => {
      const service = createService();
      await service.markFailed(
        { id: 'row-1', attempts: 2, maxAttempts: 5 } as any,
        new Error('SMTP unavailable'),
      );

      expect(repo.update).toHaveBeenCalledWith(
        'row-1',
        expect.objectContaining({
          status: EOutboxStatus.PENDING,
          lastError: 'SMTP unavailable',
        }),
      );
      const [, patch] = repo.update.mock.calls[0];
      expect(patch.availableAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('buries a message whose attempt budget is spent', async () => {
      await createService().markFailed(
        { id: 'row-1', attempts: 5, maxAttempts: 5 } as any,
        new Error('SMTP unavailable'),
      );

      expect(repo.update).toHaveBeenCalledWith('row-1', {
        status: EOutboxStatus.FAILED,
        lastError: 'SMTP unavailable',
      });
    });

    it('normalizes a non-Error failure', async () => {
      await createService().markFailed(
        { id: 'row-1', attempts: 5, maxAttempts: 5 } as any,
        'offline',
      );

      expect(repo.update).toHaveBeenCalledWith(
        'row-1',
        expect.objectContaining({ lastError: 'offline' }),
      );
    });
  });

  describe('backoffMs', () => {
    it('doubles per attempt and stops at the hourly ceiling', () => {
      const service = createService();
      expect(service.backoffMs(1)).toBe(30_000);
      expect(service.backoffMs(2)).toBe(60_000);
      expect(service.backoffMs(3)).toBe(120_000);
      expect(service.backoffMs(30)).toBe(60 * 60 * 1000);
    });
  });

  describe('pruneDelivered', () => {
    it('deletes only delivered rows past the window', async () => {
      repo.delete.mockResolvedValue({ affected: 4 });

      await expect(createService().pruneDelivered(30)).resolves.toBe(4);
      expect(repo.delete).toHaveBeenCalledWith(
        expect.objectContaining({ status: EOutboxStatus.SENT }),
      );
    });
  });
});
