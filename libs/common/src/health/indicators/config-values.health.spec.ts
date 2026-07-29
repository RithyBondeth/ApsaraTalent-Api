import { HealthCheckError } from '@nestjs/terminus';
import { ConfigValuesHealthIndicator } from './config-values.health';

describe('ConfigValuesHealthIndicator', () => {
  const indicator = { up: jest.fn(), down: jest.fn() };
  const health = { check: jest.fn(() => indicator) };
  const service = new ConfigValuesHealthIndicator(health as any);

  beforeEach(() => {
    jest.clearAllMocks();
    indicator.up.mockImplementation((details) => ({
      config: { status: 'up', ...details },
    }));
    indicator.down.mockImplementation((details) => ({
      config: { status: 'down', ...details },
    }));
  });

  it('reports present strings, arrays, zero, and false as healthy', () => {
    expect(
      service.check('config', {
        url: ' value ',
        origins: ['a'],
        retries: 0,
        enabled: false,
      }),
    ).toEqual(
      expect.objectContaining({
        config: expect.objectContaining({ status: 'up' }),
      }),
    );
  });

  it('reports every missing or blank value', () => {
    expect(() =>
      service.check('config', {
        empty: '   ',
        list: [],
        nil: null,
        absent: undefined,
      }),
    ).toThrow(HealthCheckError);
    expect(indicator.down).toHaveBeenCalledWith(
      expect.objectContaining({ missing: ['empty', 'list', 'nil', 'absent'] }),
    );
  });
});
