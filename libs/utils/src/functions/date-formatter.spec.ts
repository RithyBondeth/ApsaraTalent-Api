import { formatDateToDDMMYYYY } from './date-formatter';

describe('formatDateToDDMMYYYY', () => {
  it('formats both Date objects and serialized dates from RPC responses', () => {
    expect(formatDateToDDMMYYYY(new Date(2030, 0, 2))).toBe('02/01/2030');
    expect(formatDateToDDMMYYYY('2030-01-02T00:00:00.000Z')).toMatch(
      /^0[12]\/01\/2030$/,
    );
  });
});
