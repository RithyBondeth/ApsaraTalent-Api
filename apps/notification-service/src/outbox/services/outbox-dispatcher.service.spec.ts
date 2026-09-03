import { EOutboxChannel } from '@app/common/database/enums/outbox-channel.enum';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

describe('OutboxDispatcherService', () => {
  const outbox = {
    claimBatch: jest.fn(),
    markSent: jest.fn(),
    markFailed: jest.fn(),
    pruneDelivered: jest.fn(),
  };
  const mailer = { send: jest.fn() };
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  let values: Record<string, unknown>;
  const config = { get: jest.fn((key: string) => values[key]) };

  const createService = () =>
    new OutboxDispatcherService(
      outbox as any,
      mailer as any,
      config as any,
      logger as any,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    values = {
      'outbox.enabled': true,
      'outbox.pollIntervalMs': 5000,
      'outbox.batchSize': 20,
      'outbox.visibilityTimeoutMs': 60_000,
      'outbox.retentionDays': 30,
    };
    outbox.claimBatch.mockResolvedValue([]);
    mailer.send.mockResolvedValue({ messageId: 'email-1' });
  });

  describe('lifecycle', () => {
    it('does not start polling when the dispatcher is disabled', () => {
      values['outbox.enabled'] = false;
      const service = createService();

      service.onModuleInit();

      expect(logger.warn).toHaveBeenCalled();
      service.onModuleDestroy();
    });

    it('stops polling on shutdown', () => {
      const service = createService();
      service.onModuleInit();
      service.onModuleDestroy();

      // A drain requested after shutdown is refused rather than claiming rows
      // this process is about to stop being able to deliver.
      return service.drain().then(() => {
        expect(outbox.claimBatch).not.toHaveBeenCalled();
      });
    });
  });

  describe('drain', () => {
    it('marks a delivered message as sent', async () => {
      outbox.claimBatch.mockResolvedValue([
        { id: 'row-1', payload: { to: 'person@example.com' } },
      ]);

      await createService().drain();

      expect(outbox.claimBatch).toHaveBeenCalledWith(
        EOutboxChannel.EMAIL,
        20,
        60_000,
      );
      expect(mailer.send).toHaveBeenCalledWith({ to: 'person@example.com' });
      expect(outbox.markSent).toHaveBeenCalledWith('row-1');
    });

    it('records a failed send without abandoning the rest of the batch', async () => {
      const messages = [
        { id: 'row-1', payload: { to: 'a@example.com' } },
        { id: 'row-2', payload: { to: 'b@example.com' } },
      ];
      outbox.claimBatch.mockResolvedValue(messages);
      mailer.send.mockRejectedValueOnce(new Error('SMTP unavailable'));

      await createService().drain();

      expect(outbox.markFailed).toHaveBeenCalledWith(
        messages[0],
        expect.any(Error),
      );
      expect(outbox.markSent).toHaveBeenCalledWith('row-2');
    });

    it('leaves the backlog untouched when the claim itself fails', async () => {
      outbox.claimBatch.mockRejectedValue(new Error('database unavailable'));

      await expect(createService().drain()).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('does not run two drains at once', async () => {
      let release: () => void = () => undefined;
      outbox.claimBatch.mockImplementation(
        () => new Promise((resolve) => (release = () => resolve([]))),
      );

      const service = createService();
      const first = service.drain();
      await service.drain();

      expect(outbox.claimBatch).toHaveBeenCalledTimes(1);
      release();
      await first;
    });
  });

  describe('prune', () => {
    it('prunes delivered messages past the retention window', async () => {
      outbox.pruneDelivered.mockResolvedValue(3);

      await createService().prune();

      expect(outbox.pruneDelivered).toHaveBeenCalledWith(30);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('pruned 3'),
      );
    });

    it('survives a prune failure', async () => {
      outbox.pruneDelivered.mockRejectedValue(
        new Error('database unavailable'),
      );

      await expect(createService().prune()).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
