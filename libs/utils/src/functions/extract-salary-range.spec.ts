import { extractSalaryRange } from './extract-salary-range';

describe('extractSalaryRange', () => {
  it.each([
    [undefined, [0, 0]],
    [null, [0, 0]],
    ['', [0, 0]],
    ['Negotiable', [0, 0]],
    ['$1,000 - $2,500', [1000, 2500]],
    ['up to 900', [0, 900]],
    ['<= 1.200', [0, 1200]],
    ['max 5000', [0, 5000]],
    ['from 1,500', [1500, Infinity]],
    ['>= 750', [750, Infinity]],
    ['2000+', [2000, Infinity]],
    ['USD 850', [850, 850]],
  ])('extracts %s as %j', (input, expected) => {
    expect(extractSalaryRange(input)).toEqual(expected);
  });
});
