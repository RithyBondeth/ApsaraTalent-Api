import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
import { AddJobSearchColumns1785316800000 } from './1785316800000-AddJobSearchColumns';
import { FlexibleCompanyTypeAndJobLanguages1786500000000 } from './1786500000000-FlexibleCompanyTypeAndJobLanguages';
import { NormalizeEmploymentTypes1786500001000 } from './1786500001000-NormalizeEmploymentTypes';
import { JobSkillsRelation1786500002000 } from './1786500002000-JobSkillsRelation';
import { AddMatchScore1786500003000 } from './1786500003000-AddMatchScore';
import { EmailVerificationOtp1786500004000 } from './1786500004000-EmailVerificationOtp';
import { AddMatchSeenAt1786500005000 } from './1786500005000-AddMatchSeenAt';

// Read rather than imported: the tsconfig does not enable resolveJsonModule,
// and reading it the same way scripts/ci/migration-rehearsal.mjs does keeps
// the two consumers honest about sharing one file.
const irreversible: Record<string, string> = JSON.parse(
  readFileSync(join(__dirname, 'irreversible.json'), 'utf8'),
);

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
    ['job search columns', new AddJobSearchColumns1785316800000()],
    [
      'flexible company type and job languages',
      new FlexibleCompanyTypeAndJobLanguages1786500000000(),
    ],
    [
      'employment type normalization',
      new NormalizeEmploymentTypes1786500001000(),
    ],
    ['job skills relation', new JobSkillsRelation1786500002000()],
    ['match score column', new AddMatchScore1786500003000()],
    ['email verification otp', new EmailVerificationOtp1786500004000()],
    ['match seen timestamps', new AddMatchSeenAt1786500005000()],
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

  // Keyed by class name, so this reads the same list the rehearsal script
  // reads — `constructor.name` avoids inventing a third naming scheme
  // alongside the file names and the friendly labels above.
  const isIrreversible = (migration: object) =>
    Object.prototype.hasOwnProperty.call(
      irreversible,
      migration.constructor.name,
    );

  // Without this the list rots silently: a renamed or deleted migration would
  // leave a key matching nothing, and its rollback would quietly start being
  // skipped by both consumers for a migration that no longer exists.
  it('lists only real migrations as irreversible', () => {
    const known = new Set(migrations.map(([, m]) => m.constructor.name));
    const declared = Object.keys(irreversible).filter(
      (key) => !key.startsWith('$'),
    );
    expect(declared.length).toBeGreaterThan(0);
    for (const name of declared) {
      expect(known).toContain(name);
    }
  });

  it.each(migrations.filter(([, migration]) => !isIrreversible(migration)))(
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
