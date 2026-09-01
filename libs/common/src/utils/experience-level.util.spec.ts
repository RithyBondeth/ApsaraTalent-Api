import {
  EXPERIENCE_UNBOUNDED,
  experienceYearsSql,
  parseExperienceRange,
} from './experience-level.util';

describe('parseExperienceRange', () => {
  it('reads the canonical UI ladder', () => {
    expect(parseExperienceRange('No Experience')).toEqual({ min: 0, max: 0 });
    expect(parseExperienceRange('Less than 1 year')).toEqual({
      min: 0,
      max: 0,
    });
    expect(parseExperienceRange('1 - 2 years')).toEqual({ min: 1, max: 2 });
    expect(parseExperienceRange('3 - 5 years')).toEqual({ min: 3, max: 5 });
    expect(parseExperienceRange('6 - 10 years')).toEqual({ min: 6, max: 10 });
    expect(parseExperienceRange('10+ years')).toEqual({
      min: 10,
      max: EXPERIENCE_UNBOUNDED,
    });
  });

  it('reads the shapes actually stored in the columns', () => {
    // job.experienceRequired
    expect(parseExperienceRange('1+ years')).toEqual({
      min: 1,
      max: EXPERIENCE_UNBOUNDED,
    });
    expect(parseExperienceRange('4+ years')).toEqual({
      min: 4,
      max: EXPERIENCE_UNBOUNDED,
    });
    // employee.yearsOfExperience
    expect(parseExperienceRange('3 years')).toEqual({ min: 3, max: 3 });
    expect(parseExperienceRange('1 year')).toEqual({ min: 1, max: 1 });
    expect(parseExperienceRange('5')).toEqual({ min: 5, max: 5 });
  });

  it('returns null for values that carry no filter meaning', () => {
    expect(parseExperienceRange(undefined)).toBeNull();
    expect(parseExperienceRange(null)).toBeNull();
    expect(parseExperienceRange('')).toBeNull();
    expect(parseExperienceRange('   ')).toBeNull();
    expect(parseExperienceRange('All')).toBeNull();
    expect(parseExperienceRange('unknown')).toBeNull();
  });
});

describe('experienceYearsSql', () => {
  it('falls back to zero so unparseable rows are not dropped', () => {
    const sql = experienceYearsSql('"job"."experienceRequired"');
    expect(sql).toContain('COALESCE');
    expect(sql).toContain(
      'substring("job"."experienceRequired" from \'[0-9]+\')',
    );
    expect(sql).toContain(', 0)');
  });
});
