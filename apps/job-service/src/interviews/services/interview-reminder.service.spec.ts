import { InterviewReminderService } from './interview-reminder.service';

describe('InterviewReminderService', () => {
  const repo = { find: jest.fn(), update: jest.fn() };
  const notificationClient = { emit: jest.fn() };
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const service = new InterviewReminderService(
    repo as any,
    notificationClient as any,
    logger as any,
  );

  const interview = (overrides: Record<string, unknown> = {}) => ({
    id: 'iv-1',
    title: 'System design round',
    scheduledAt: new Date('2026-09-05T08:00:00.000Z'),
    timezone: 'Asia/Phnom_Penh',
    status: 'pending',
    reminder24hSentAt: null,
    reminder1hSentAt: null,
    employee: { id: 'e-1', user: { id: 'u-e' } },
    company: { id: 'c-1', user: { id: 'u-c' } },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repo.find.mockResolvedValue([]);
    repo.update.mockResolvedValue({ affected: 1 });
  });

  it('sends both a 24h and a 1h reminder in one tick', async () => {
    repo.find
      .mockResolvedValueOnce([interview({ id: 'iv-24' })])
      .mockResolvedValueOnce([interview({ id: 'iv-1h' })]);

    await service.sendDueReminders();

    // 24h → 1h, two batches, both processed on the same tick so the cron
    // doesn't have to wait for the next firing to catch a fresh 24h and an
    // imminent 1h.
    expect(repo.find).toHaveBeenCalledTimes(2);
    expect(repo.update).toHaveBeenCalledWith(
      { id: 'iv-24' },
      expect.objectContaining({ reminder24hSentAt: expect.any(Date) }),
    );
    expect(repo.update).toHaveBeenCalledWith(
      { id: 'iv-1h' },
      expect.objectContaining({ reminder1hSentAt: expect.any(Date) }),
    );
  });

  it('notifies both sides so a scheduler cannot forget either', async () => {
    repo.find.mockResolvedValueOnce([interview()]).mockResolvedValueOnce([]);

    await service.sendDueReminders();

    // Employee + company; the pain of missing an interview is symmetrical.
    expect(notificationClient.emit).toHaveBeenCalledTimes(2);
    const targetUserIds = notificationClient.emit.mock.calls.map(
      ([, payload]) => (payload as any).userId,
    );
    expect(targetUserIds.sort()).toEqual(['u-c', 'u-e']);

    const [, payload] = notificationClient.emit.mock.calls[0];
    expect((payload as any).message).toContain('Asia/Phnom_Penh');
    expect((payload as any).data.eventType).toBe('interview_reminder_24h');
  });

  it('falls back to UTC in the copy when the interview has no stored timezone', async () => {
    repo.find
      .mockResolvedValueOnce([interview({ timezone: null })])
      .mockResolvedValueOnce([]);

    await service.sendDueReminders();

    const [, payload] = notificationClient.emit.mock.calls[0];
    // Legacy rows must never blank the time. UTC + label is the fallback.
    expect((payload as any).message).toContain('(UTC)');
  });

  it('skips a cancelled or completed interview even inside the window', async () => {
    repo.find
      .mockResolvedValueOnce([
        interview({ status: 'cancelled' }),
        interview({ id: 'iv-completed', status: 'completed' }),
      ])
      .mockResolvedValueOnce([]);

    await service.sendDueReminders();

    // A reminder for a cancelled call is confusing at best. Filtered in code
    // so the DB predicate stays simple; the miss rate is small enough.
    expect(notificationClient.emit).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('marks the row before sending — an under-remind is safer than a double-remind', async () => {
    repo.find.mockResolvedValueOnce([interview()]).mockResolvedValueOnce([]);

    await service.sendDueReminders();

    // The mark comes first, then the emits. If the mark fails, no send; if
    // the send fails, the row is already marked. Either half of a partial
    // failure loses a courtesy, not delivers it twice.
    const markOrder = repo.update.mock.invocationCallOrder[0];
    const emitOrder = notificationClient.emit.mock.invocationCallOrder[0];
    expect(markOrder).toBeLessThan(emitOrder);
  });

  it('does not emit when the row cannot be marked', async () => {
    repo.find.mockResolvedValueOnce([interview()]).mockResolvedValueOnce([]);
    repo.update.mockRejectedValueOnce(new Error('database unavailable'));

    await service.sendDueReminders();

    expect(notificationClient.emit).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('logs and survives a database failure — the next tick tries again', async () => {
    repo.find.mockRejectedValue(new Error('database unavailable'));

    await expect(service.sendDueReminders()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it('queries only unsent reminders through the sent-flag column', async () => {
    // Idempotency is a column, not memory: the query itself requires the
    // relevant sent-flag to still be null.
    repo.find.mockResolvedValue([]);

    await service.sendDueReminders();

    const [firstArgs] = repo.find.mock.calls;
    expect(firstArgs[0].where.reminder24hSentAt).toBeDefined();
    const [secondArgs] = repo.find.mock.calls.slice(1);
    expect(secondArgs[0].where.reminder1hSentAt).toBeDefined();
  });

  it('sends the interview_reminder_1h eventType for the second window', async () => {
    repo.find.mockResolvedValueOnce([]).mockResolvedValueOnce([interview()]);

    await service.sendDueReminders();

    const [, payload] = notificationClient.emit.mock.calls[0];
    expect((payload as any).data.eventType).toBe('interview_reminder_1h');
    expect(
      (
        notificationClient.emit.mock.calls[0][1] as {
          title: string;
        }
      ).title,
    ).toBe('Interview in about an hour');
  });
});
