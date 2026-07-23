import { AddChatAudio1773705600000 } from './1773705600000-AddChatAudio';
import { AddNotifications1773705601000 } from './1773705601000-AddNotifications';
import { AddPgvectorCareerScope1778889600000 } from './1778889600000-AddPgvectorCareerScope';
import { NormalizeExperienceLevels1781136000000 } from './1781136000000-NormalizeExperienceLevels';
import { ModerationBlockReport1781308800000 } from './1781308800000-ModerationBlockReport';
import { SearchIndexes1781308801000 } from './1781308801000-SearchIndexes';
import { CompanyLocationSearchIndex1781568000000 } from './1781568000000-CompanyLocationSearchIndex';
import { AddExperienceCompany1783987200000 } from './1783987200000-AddExperienceCompany';
import { AddResumeTemplateKey1783987201000 } from './1783987201000-AddResumeTemplateKey';

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

  it.each(migrations.filter(([name]) => name !== 'experience normalization'))(
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
