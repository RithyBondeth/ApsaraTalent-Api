import {
  RELEVANCE_SORT,
  relevanceParams,
  relevanceScoreSql,
} from './search-relevance.util';

describe('relevanceScoreSql', () => {
  it('weights an exact primary hit above a mere contains', () => {
    const sql = relevanceScoreSql({ primary: 'job.title' });
    const exact = sql.indexOf('THEN 100');
    const prefix = sql.indexOf('THEN 50');
    const contains = sql.indexOf('THEN 25');
    expect(exact).toBeGreaterThanOrEqual(0);
    expect(prefix).toBeGreaterThan(exact);
    expect(contains).toBeGreaterThan(prefix);
  });

  it('scores secondary fields above tertiary ones', () => {
    const sql = relevanceScoreSql({
      primary: 'job.title',
      secondary: ['job."skillsRequired"'],
      tertiary: ['job.description'],
    });
    expect(sql).toContain('job."skillsRequired" ILIKE :relevanceLike THEN 10');
    expect(sql).toContain('job.description ILIKE :relevanceLike THEN 4');
  });

  it('ends with a sub-1 similarity tiebreak on the primary field', () => {
    const sql = relevanceScoreSql({ primary: 'job.title' });
    expect(sql).toContain("similarity(COALESCE(job.title, ''), :relevanceRaw)");
  });

  it('binds the keyword rather than interpolating it', () => {
    expect(relevanceParams('  Backend Engineer  ')).toEqual({
      relevanceExact: 'Backend Engineer',
      relevancePrefix: 'Backend Engineer%',
      relevanceLike: '%Backend Engineer%',
      relevanceRaw: 'Backend Engineer',
    });
  });

  it('names the relevance sort key', () => {
    expect(RELEVANCE_SORT).toBe('relevance');
  });
});
