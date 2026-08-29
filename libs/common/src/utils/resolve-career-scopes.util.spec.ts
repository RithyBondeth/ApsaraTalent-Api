import { CAREER_SCOPE } from '@app/contracts/constants/domain/career-scope.constant';
import {
  SCOPE_DEDUP_THRESHOLD,
  normalizeScopeName,
  resolveCareerScopes,
} from './resolve-career-scopes.util';

describe('normalizeScopeName', () => {
  it('collapses repeated and surrounding whitespace', () => {
    expect(normalizeScopeName('  Frontend   Development  ')).toBe(
      'Frontend Development',
    );
  });

  it('normalizes the dash characters word processors substitute', () => {
    expect(normalizeScopeName('Front‑End Development')).toBe(
      'Front-End Development',
    );
  });

  it('preserves case so the first spelling keeps its display form', () => {
    expect(normalizeScopeName('frontend development')).toBe(
      'frontend development',
    );
  });

  it('truncates past the stored maximum', () => {
    const long = 'a'.repeat(CAREER_SCOPE.NAME_MAX_LENGTH + 20);
    expect(normalizeScopeName(long)).toHaveLength(CAREER_SCOPE.NAME_MAX_LENGTH);
  });
});

describe('resolveCareerScopes', () => {
  const logger = { warn: jest.fn(), info: jest.fn() };
  const embeddingService = { embedAsVector: jest.fn() };

  let existingRows: { id: string; name: string }[];
  let nearest: { id: string; name: string; similarity: string }[];
  let saved: { id: string; name: string; description: string | null }[];
  let rawQueries: { sql: string; params: unknown[] }[];

  const repository = {
    query: jest.fn(async (sql: string, params: unknown[]) => {
      rawQueries.push({ sql, params });
      if (sql.includes('= ANY')) return existingRows;
      if (sql.includes('SELECT')) return nearest;
      return [];
    }),
    create: jest.fn((row) => row),
    save: jest.fn(async (row: { name: string; description: string | null }) => {
      const persisted = { id: `new-${saved.length + 1}`, ...row };
      saved.push(persisted);
      return persisted;
    }),
    findOne: jest.fn(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      name: 'Frontend Development',
    })),
  };

  const run = (names: string[]) =>
    resolveCareerScopes({
      repository: repository as any,
      embeddingService: embeddingService as any,
      logger: logger as any,
      wanted: new Map(names.map((n) => [n, { description: null }])),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    existingRows = [];
    nearest = [];
    saved = [];
    rawQueries = [];
    embeddingService.embedAsVector.mockResolvedValue('[0.1,0.2]');
  });

  it('returns nothing and touches no collaborator for an empty set', async () => {
    await expect(run([])).resolves.toEqual([]);
    expect(embeddingService.embedAsVector).not.toHaveBeenCalled();
    expect(repository.query).not.toHaveBeenCalled();
  });

  it('reuses an existing row on a case-insensitive name match', async () => {
    existingRows = [{ id: 'cs-1', name: 'Frontend Development' }];
    await expect(run(['frontend development'])).resolves.toEqual([
      { id: 'cs-1', name: 'Frontend Development' },
    ]);
    expect(embeddingService.embedAsVector).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('reuses an existing row when the vector is a near synonym', async () => {
    nearest = [
      {
        id: 'cs-1',
        name: 'Frontend Development',
        similarity: String(SCOPE_DEDUP_THRESHOLD + 0.01),
      },
    ];
    const result = await run(['Front-End Development']);
    expect(result).toEqual([{ id: 'cs-1', name: 'Frontend Development' }]);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('creates a row when the nearest vector is below the threshold', async () => {
    nearest = [
      {
        id: 'cs-1',
        name: 'Software Engineering',
        similarity: String(SCOPE_DEDUP_THRESHOLD - 0.01),
      },
    ];
    await run(['DevOps Engineering']);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(saved[0].name).toBe('DevOps Engineering');
  });

  it('persists the vector it already computed alongside the new row', async () => {
    await run(['Quantum Bricklaying']);
    const update = rawQueries.find((q) => q.sql.includes('UPDATE'));
    expect(update?.params).toEqual(['[0.1,0.2]', 'new-1']);
  });

  it('creates the row without a vector when embedding fails', async () => {
    embeddingService.embedAsVector.mockRejectedValue(new Error('OpenAI down'));
    await run(['Quantum Bricklaying']);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(rawQueries.some((q) => q.sql.includes('UPDATE'))).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('creating without a vector'),
    );
  });

  it('embeds once per unseen name, not once per submitted name', async () => {
    existingRows = [{ id: 'cs-1', name: 'Frontend Development' }];
    await run(['Frontend Development', 'Quantum Bricklaying']);
    expect(embeddingService.embedAsVector).toHaveBeenCalledTimes(1);
    expect(embeddingService.embedAsVector).toHaveBeenCalledWith(
      'Quantum Bricklaying',
    );
  });
});
