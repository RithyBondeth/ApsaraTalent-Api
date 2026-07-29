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
