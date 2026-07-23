import { VectorColumnsService } from './vector-columns.service';

describe('VectorColumnsService', () => {
  const dataSource = { query: jest.fn() };
  const embedding = { embedAsVector: jest.fn() };
  const logger = { setContext: jest.fn(), info: jest.fn(), warn: jest.fn() };
  const service = new VectorColumnsService(
    dataSource as any,
    embedding as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    embedding.embedAsVector.mockResolvedValue('[0.1,0.2]');
  });

  it('leaves an existing vector column unchanged', async () => {
    dataSource.query.mockResolvedValueOnce([{ udt_name: 'vector' }]);
    await expect(
      (service as any).restoreIfNeeded('job', 'titleEmbedding', 'idx_job'),
    ).resolves.toBe(false);
    expect(dataSource.query).toHaveBeenCalledTimes(1);
  });

  it('creates a missing vector column and its HNSW index', async () => {
    dataSource.query.mockResolvedValueOnce([]).mockResolvedValue(undefined);
    await expect(
      (service as any).restoreIfNeeded('job', 'titleEmbedding', 'idx_job'),
    ).resolves.toBe(true);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('ADD COLUMN IF NOT EXISTS'),
    );
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('USING hnsw'),
    );
  });

  it('replaces a wrongly typed column and recreates its index', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ udt_name: 'text' }])
      .mockResolvedValue(undefined);
    await expect(
      (service as any).restoreIfNeeded(
        'employee',
        'jobEmbedding',
        'idx_employee',
      ),
    ).resolves.toBe(true);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('DROP COLUMN'),
    );
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('vector(1536)'),
    );
  });

  it('re-embeds missing career scopes while containing individual failures', async () => {
    dataSource.query
      .mockResolvedValueOnce([
        { id: 'scope-1', name: 'Engineering' },
        { id: 'scope-2', name: 'Design' },
      ])
      .mockResolvedValue(undefined);
    embedding.embedAsVector
      .mockResolvedValueOnce('[1,0]')
      .mockRejectedValueOnce(new Error('provider down'));
    await (service as any).reembedCareerScopes();
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE career_scope'),
      ['[1,0]', 'scope-1'],
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('provider down'),
    );
  });

  it('re-embeds missing employee jobs and job titles', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ id: 'employee-1', job: 'Developer' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: 'job-1', title: 'Backend Engineer' }])
      .mockResolvedValueOnce(undefined);
    await (service as any).reembedEmployeeJobs();
    await (service as any).reembedJobTitles();
    expect(embedding.embedAsVector).toHaveBeenCalledWith('Developer');
    expect(embedding.embedAsVector).toHaveBeenCalledWith('Backend Engineer');
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE employee'),
      ['[0.1,0.2]', 'employee-1'],
    );
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE job'),
      ['[0.1,0.2]', 'job-1'],
    );
  });

  it('contains bootstrap database failures so application startup continues', async () => {
    dataSource.query.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('database unavailable'),
    );
  });
});
