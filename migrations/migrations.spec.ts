import { AddChatAudio1773705600000 } from './1773705600000-AddChatAudio';
import { AddNotifications1773705601000 } from './1773705601000-AddNotifications';
import { AddPgvectorCareerScope1778889600000 } from './1778889600000-AddPgvectorCareerScope';
import { NormalizeExperienceLevels1781136000000 } from './1781136000000-NormalizeExperienceLevels';
import { ModerationBlockReport1781308800000 } from './1781308800000-ModerationBlockReport';
import { SearchIndexes1781308801000 } from './1781308801000-SearchIndexes';
import { CompanyLocationSearchIndex1781568000000 } from './1781568000000-CompanyLocationSearchIndex';
import { AddExperienceCompany1783987200000 } from './1783987200000-AddExperienceCompany';
import { AddResumeTemplateKey1783987201000 } from './1783987201000-AddResumeTemplateKey';
import { HashRefreshTokens1784073600000 } from './1784073600000-HashRefreshTokens';

describe('database migration contracts', () => {
  const migrations = [
    ['chat audio', new AddChatAudio1773705600000()],
    ['notifications', new AddNotifications1773705601000()],
    ['pgvector career scope', new AddPgvectorCareerScope1778889600000()],
    ['experience normalization', new NormalizeExperienceLevels1781136000000()],
    ['moderation', new ModerationBlockReport1781308800000()],
    ['search indexes', new SearchIndexes1781308801000()],
    ['company location index', new CompanyLocationSearchIndex1781568000000()],
    ['experience company', new AddExperienceCompany1783987200000()],
    ['resume template key', new AddResumeTemplateKey1783987201000()],
    ['hash refresh tokens', new HashRefreshTokens1784073600000()],
  ] as const;

  it.each(migrations)(
    '%s migration executes its forward SQL',
    async (_name, migration) => {
      const query = jest.fn().mockResolvedValue(undefined);
      await migration.up({ query } as any);
      expect(query).toHaveBeenCalled();
      for (const [sql] of query.mock.calls) {
        expect(typeof sql).toBe('string');
        expect(sql.trim().length).toBeGreaterThan(0);
      }
    },
  );

  const irreversible = ['experience normalization', 'hash refresh tokens'];

  it.each(migrations.filter(([name]) => !irreversible.includes(name)))(
    '%s migration provides executable rollback SQL',
    async (_name, migration) => {
      const query = jest.fn().mockResolvedValue(undefined);
      await migration.down({ query } as any);
      expect(query).toHaveBeenCalled();
    },
  );

  it('documents experience normalization as intentionally irreversible', async () => {
    const migration = new NormalizeExperienceLevels1781136000000();
    await expect(migration.down()).resolves.toBeUndefined();
  });

  it('does not restore plaintext refresh tokens on rollback', async () => {
    // Reversing this migration would mean writing bearer credentials back in
    // plaintext, which is the vulnerability it exists to remove.
    const migration = new HashRefreshTokens1784073600000();
    const query = jest.fn();
    await expect(migration.down()).resolves.toBeUndefined();
    expect(query).not.toHaveBeenCalled();
  });

  it('clears every stored refresh token when hashing is introduced', async () => {
    const migration = new HashRefreshTokens1784073600000();
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.up({ query } as any);
    const sql = query.mock.calls.map(([s]) => s).join('\n');
    expect(sql).toMatch(/UPDATE "user"/i);
    expect(sql).toMatch(/"refreshToken" = NULL/i);
  });

  it('propagates database failures so TypeORM can stop and roll back', async () => {
    const migration = new AddChatAudio1773705600000();
    const query = jest
      .fn()
      .mockRejectedValue(new Error('database unavailable'));
    await expect(migration.up({ query } as any)).rejects.toThrow(
      'database unavailable',
    );
  });
});
