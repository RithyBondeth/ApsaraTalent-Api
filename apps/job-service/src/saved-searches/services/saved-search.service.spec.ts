import { ESavedSearchFrequency } from '@app/common/database/enums/saved-search-frequency.enum';
import { RpcException } from '@nestjs/microservices';
import { SavedSearchService } from './saved-search.service';

describe('SavedSearchService', () => {
  const savedSearches = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const employees = { findOne: jest.fn() };
  const jobService = { searchJobs: jest.fn() };
  const logger = { setContext: jest.fn(), error: jest.fn(), warn: jest.fn() };

  const service = new SavedSearchService(
    savedSearches as any,
    employees as any,
    jobService as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    savedSearches.save.mockImplementation(async (value) => ({
      id: value.id ?? 'saved-1',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      ...value,
    }));
    jobService.searchJobs.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 50,
      isUsingFallback: false,
    });
  });

  async function expectRpc(
    promise: Promise<unknown>,
    statusCode: number,
    message: string,
  ) {
    const error = (await promise.catch((caught) => caught)) as RpcException;
    expect(error).toBeInstanceOf(RpcException);
    expect(error.getError()).toEqual({ statusCode, message });
  }

  it('404s when the employee profile is missing', async () => {
    employees.findOne.mockResolvedValue(null);
    await expectRpc(
      service.listSavedSearches('user-1'),
      404,
      'Employee not found',
    );
  });

  it('lists the caller employee saved searches newest first', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    savedSearches.find.mockResolvedValue([
      {
        id: 'saved-1',
        name: 'Senior Go',
        filters: {},
        frequency: ESavedSearchFrequency.DAILY,
        lastNotifiedAt: null,
        lastResultJobIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const rows = await service.listSavedSearches('user-1');
    expect(savedSearches.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { employee: { id: 'employee-1' } },
        order: { createdAt: 'DESC' },
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Senior Go');
  });

  it('seeds lastResultJobIds from the current search on create', async () => {
    // Without this, the first digest would surface every job in the current
    // result page — jobs the user just read on screen, not "new since".
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    jobService.searchJobs.mockResolvedValueOnce({
      data: [{ id: 'job-1' }, { id: 'job-2' }],
      total: 2,
      page: 1,
      pageSize: 50,
      isUsingFallback: false,
    });

    const saved = await service.createSavedSearch('user-1', {
      name: '  Senior Go  ',
      filters: { keyword: 'go' } as never,
    });

    expect(savedSearches.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Senior Go', // trimmed
        frequency: ESavedSearchFrequency.DAILY,
        lastResultJobIds: ['job-1', 'job-2'],
        lastNotifiedAt: null,
      }),
    );
    expect(saved.lastResultJobIds).toEqual(['job-1', 'job-2']);
  });

  it('honours a caller-specified frequency', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    await service.createSavedSearch('user-1', {
      name: 'Weekly digest',
      filters: {} as never,
      frequency: ESavedSearchFrequency.WEEKLY,
    });
    expect(savedSearches.create).toHaveBeenCalledWith(
      expect.objectContaining({ frequency: ESavedSearchFrequency.WEEKLY }),
    );
  });

  it('updates name and frequency without touching the seen set', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    const existing = {
      id: 'saved-1',
      name: 'old',
      filters: { keyword: 'go' },
      frequency: ESavedSearchFrequency.DAILY,
      lastResultJobIds: ['job-1'],
      lastNotifiedAt: null,
    };
    savedSearches.findOne.mockResolvedValueOnce(existing);

    await service.updateSavedSearch('user-1', 'saved-1', {
      name: 'new',
      frequency: ESavedSearchFrequency.WEEKLY,
    });

    expect(existing.name).toBe('new');
    expect(existing.frequency).toBe(ESavedSearchFrequency.WEEKLY);
    // Left alone — the search itself did not change.
    expect(existing.lastResultJobIds).toEqual(['job-1']);
    expect(jobService.searchJobs).not.toHaveBeenCalled();
  });

  it('reseeds the seen set when the filters change', async () => {
    // Replacing filters is effectively a new search; the next digest must
    // diff against the new baseline, not the old one, or every unrelated job
    // in the new query would be flagged as "new".
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    savedSearches.findOne.mockResolvedValueOnce({
      id: 'saved-1',
      name: 'go',
      filters: { keyword: 'go' },
      frequency: ESavedSearchFrequency.DAILY,
      lastResultJobIds: ['job-old'],
      lastNotifiedAt: null,
    });
    jobService.searchJobs.mockResolvedValueOnce({
      data: [{ id: 'job-new-1' }, { id: 'job-new-2' }],
      total: 2,
      page: 1,
      pageSize: 50,
      isUsingFallback: false,
    });

    const updated = await service.updateSavedSearch('user-1', 'saved-1', {
      filters: { keyword: 'rust' } as never,
    });

    expect(updated.lastResultJobIds).toEqual(['job-new-1', 'job-new-2']);
  });

  it('404s when a caller updates a saved search they do not own', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    savedSearches.findOne.mockResolvedValueOnce(null);
    await expectRpc(
      service.updateSavedSearch('user-1', 'saved-1', { name: 'x' }),
      404,
      'Saved search not found',
    );
  });

  it('deletes only rows owned by the caller', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    const row = { id: 'saved-1' };
    savedSearches.findOne.mockResolvedValueOnce(row);

    await expect(
      service.deleteSavedSearch('user-1', 'saved-1'),
    ).resolves.toEqual({ message: 'Saved search deleted' });
    expect(savedSearches.remove).toHaveBeenCalledWith(row);
  });

  it('previews with the diff against the seen set', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    savedSearches.findOne.mockResolvedValueOnce({
      id: 'saved-1',
      filters: {},
      lastResultJobIds: ['job-1', 'job-2'],
    });
    jobService.searchJobs.mockResolvedValueOnce({
      data: [{ id: 'job-1' }, { id: 'job-2' }, { id: 'job-3' }],
      total: 3,
      page: 1,
      pageSize: 50,
      isUsingFallback: false,
    });

    const preview = await service.previewSavedSearch('user-1', 'saved-1');
    expect(preview.totalMatches).toBe(3);
    expect(preview.newMatchCount).toBe(1);
  });

  it('caps pageSize at 50 when running the saved query', async () => {
    // A digest surfaces the top slice, not everything — an unbounded page
    // would blow the email past every mail host's size limit.
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    await service.createSavedSearch('user-1', {
      name: 'x',
      filters: { keyword: 'k', pageSize: 500 } as never,
    });
    expect(jobService.searchJobs).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 50, page: 1 }),
    );
  });
});
