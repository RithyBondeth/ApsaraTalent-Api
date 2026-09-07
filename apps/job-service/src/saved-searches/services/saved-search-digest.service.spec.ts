import { ESavedSearchFrequency } from '@app/common/database/enums/saved-search-frequency.enum';
import { SavedSearchDigestService } from './saved-search-digest.service';

describe('SavedSearchDigestService', () => {
  const savedSearches = {
    find: jest.fn(),
    update: jest.fn(),
  };
  const savedSearchService = { runSearch: jest.fn() };
  const emailService = { sendEmail: jest.fn() };
  const notifications = { emit: jest.fn() };
  const configService = { get: jest.fn() };
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const dispatcher = new SavedSearchDigestService(
    savedSearches as any,
    savedSearchService as any,
    emailService as any,
    notifications as any,
    configService as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockReturnValue('https://app.test');
    savedSearches.update.mockResolvedValue({ affected: 1 });
    emailService.sendEmail.mockResolvedValue({ queued: true, id: 'out-1' });
  });

  it('emails when the incoming result contains a job not in the seen set', async () => {
    // The whole point: only new ids get surfaced. A digest for the exact
    // same result set as last time is silence, by design.
    savedSearches.find.mockResolvedValueOnce([
      {
        id: 'saved-1',
        name: 'Senior Go',
        filters: {},
        frequency: ESavedSearchFrequency.DAILY,
        lastResultJobIds: ['job-1'],
        employee: { user: { id: 'user-1', email: 'a@x' } },
      },
    ]);
    savedSearches.find.mockResolvedValueOnce([]); // weekly bucket empty
    savedSearchService.runSearch.mockResolvedValueOnce({
      jobIds: ['job-1', 'job-2'],
      total: 2,
    });

    await dispatcher.dispatchDueDigests();

    // Both the stamp and the seen-set write happen together on the same
    // update — the seen set must not drift out of sync with the stamp, or
    // the next tick would report the same "new" ids again.
    expect(savedSearches.update).toHaveBeenCalledWith(
      { id: 'saved-1' },
      expect.objectContaining({
        lastNotifiedAt: expect.any(Date),
        lastResultJobIds: ['job-1', 'job-2'],
      }),
    );
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'a@x',
        subject: expect.stringContaining('1 new job'),
      }),
    );
    expect(notifications.emit).toHaveBeenCalled();
  });

  it('stays silent when nothing is new — but still stamps to advance the window', async () => {
    savedSearches.find.mockResolvedValueOnce([
      {
        id: 'saved-1',
        name: 'Senior Go',
        filters: {},
        frequency: ESavedSearchFrequency.DAILY,
        lastResultJobIds: ['job-1', 'job-2'],
        employee: { user: { id: 'user-1', email: 'a@x' } },
      },
    ]);
    savedSearches.find.mockResolvedValueOnce([]);
    savedSearchService.runSearch.mockResolvedValueOnce({
      jobIds: ['job-1', 'job-2'],
      total: 2,
    });

    await dispatcher.dispatchDueDigests();

    expect(savedSearches.update).toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(notifications.emit).not.toHaveBeenCalled();
  });

  it('fires the in-app notification even when the user has no email', async () => {
    // A user who signed up via a social provider that hides email should
    // still see the count on their feed — the digest is not email-only.
    savedSearches.find.mockResolvedValueOnce([
      {
        id: 'saved-1',
        name: 'Senior Go',
        filters: {},
        frequency: ESavedSearchFrequency.DAILY,
        lastResultJobIds: [],
        employee: { user: { id: 'user-1', email: null } },
      },
    ]);
    savedSearches.find.mockResolvedValueOnce([]);
    savedSearchService.runSearch.mockResolvedValueOnce({
      jobIds: ['job-1'],
      total: 1,
    });

    await dispatcher.dispatchDueDigests();
    expect(notifications.emit).toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it('stamps without notifying when the search itself fails', async () => {
    // A persistently-broken filter must not thunder every tick.
    savedSearches.find.mockResolvedValueOnce([
      {
        id: 'saved-1',
        name: 'x',
        filters: {},
        frequency: ESavedSearchFrequency.DAILY,
        lastResultJobIds: [],
        employee: { user: { id: 'user-1', email: 'a@x' } },
      },
    ]);
    savedSearches.find.mockResolvedValueOnce([]);
    savedSearchService.runSearch.mockRejectedValueOnce(
      new Error('search down'),
    );

    await dispatcher.dispatchDueDigests();

    expect(savedSearches.update).toHaveBeenCalledWith(
      { id: 'saved-1' },
      expect.objectContaining({ lastNotifiedAt: expect.any(Date) }),
    );
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(notifications.emit).not.toHaveBeenCalled();
  });

  it('skips notifying when the stamp write fails', async () => {
    // Ordering matters: mark first, notify after. A failed mark means the
    // next tick will see the same rows unstamped and try again — under-
    // notifying is safer than double-notifying under a race.
    savedSearches.find.mockResolvedValueOnce([
      {
        id: 'saved-1',
        name: 'x',
        filters: {},
        frequency: ESavedSearchFrequency.DAILY,
        lastResultJobIds: [],
        employee: { user: { id: 'user-1', email: 'a@x' } },
      },
    ]);
    savedSearches.find.mockResolvedValueOnce([]);
    savedSearchService.runSearch.mockResolvedValueOnce({
      jobIds: ['job-1'],
      total: 1,
    });
    savedSearches.update.mockRejectedValueOnce(new Error('stamp down'));

    await dispatcher.dispatchDueDigests();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(notifications.emit).not.toHaveBeenCalled();
  });

  it('does not include OFF rows in the picking query', async () => {
    // OFF is a first-class value — the picking query only fans out over the
    // frequencies that actually run digests. If OFF ever slipped in, a
    // paused search would still email.
    savedSearches.find.mockResolvedValue([]);
    await dispatcher.dispatchDueDigests();

    for (const call of savedSearches.find.mock.calls) {
      const where = call[0]?.where;
      expect(where?.frequency).not.toBe(ESavedSearchFrequency.OFF);
    }
  });
});
