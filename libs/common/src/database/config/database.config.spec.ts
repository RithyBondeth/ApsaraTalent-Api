import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { databaseConfig } from './database.config';

describe('databaseConfig', () => {
  it('maps database settings and applies safe pool limits', async () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'database.url') return 'postgres://localhost/test';
        if (key === 'database.synchronize') return false;
        return undefined;
      }),
    };
    const result = await databaseConfig(config as any);
    expect(result).toEqual(
      expect.objectContaining({
        type: 'postgres',
        url: 'postgres://localhost/test',
        synchronize: false,
        relationLoadStrategy: 'query',
        maxQueryExecutionTime: 1000,
        extra: expect.objectContaining({
          max: 20,
          min: 2,
          statement_timeout: 15000,
        }),
      }),
    );
    expect(result.entities).toEqual(
      expect.arrayContaining([expect.any(Function)]),
    );
  });
});

/**
 * Every entity must be listed on the DataSource.
 *
 * Registering one with `TypeOrmModule.forFeature` in a service module is not
 * enough. An entity missing from `databaseConfig.entities` has no metadata on
 * the connection, so the first repository call for it throws
 * `No metadata for "X" was found` — a 500 that never reaches Postgres and
 * that nothing catches at build time.
 *
 * Five were missing when this was written: SavedSearch, ProfileView,
 * ProfileSearchAppearance, ApplicationNote and ApplicationStatusHistory. Each
 * had a table, a service and routes, and every one of those routes answered
 * 500 in production.
 */
describe('databaseConfig entities', () => {
  const entitiesDir = join(__dirname, '..', 'entities');
  const configSource = readFileSync(
    join(__dirname, 'database.config.ts'),
    'utf8',
  );

  /** The class names declared under `entities/`. */
  const declaredEntities = (): { file: string; name: string }[] => {
    const found: { file: string; name: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith('.entity.ts')) continue;
        for (const match of readFileSync(full, 'utf8').matchAll(
          /^export class (\w+)/gm,
        )) {
          found.push({ file: entry.name, name: match[1] });
        }
      }
    };
    walk(entitiesDir);
    return found;
  };

  it('finds the entity files to check', () => {
    expect(declaredEntities().length).toBeGreaterThan(20);
  });

  it.each(declaredEntities())(
    'registers $name ($file) on the DataSource',
    ({ name }) => {
      // Checked against the entities array, not the imports: an import alone
      // compiles fine and still leaves the entity without metadata.
      const start = configSource.indexOf('entities: [');
      const entitiesBlock = configSource.slice(
        start,
        configSource.indexOf('],', start),
      );
      expect(entitiesBlock).toContain(`\n    ${name},`);
    },
  );
});
