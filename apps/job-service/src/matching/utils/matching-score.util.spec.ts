import { Company } from '@app/common/database/entities/company/company.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { EWorkMode } from '@app/common/database/enums/work-mode.enum';
import { ENoticePeriod } from '@app/common/database/enums/notice-period.enum';
import {
  computeMatchScore,
  computeSkillScore,
  MATCH_WEIGHTS,
} from './matching-score.util';

/* --------------------------------- Builders -------------------------------- */
const employee = (partial: Partial<Employee> = {}): Employee =>
  ({
    skills: [{ name: 'TypeScript' }, { name: 'React' }],
    yearsOfExperience: '3 - 5 years',
    availability: 'full_time',
    workMode: EWorkMode.HYBRID,
    noticePeriod: ENoticePeriod.IMMEDIATE,
    languages: ['Khmer', 'English'],
    location: 'Phnom Penh',
    ...partial,
  }) as Employee;

const company = (jobs: Record<string, unknown>[] = []): Company =>
  ({ location: 'Phnom Penh', openPositions: jobs }) as unknown as Company;

const job = (partial: Record<string, unknown> = {}) => ({
  skillsRequired: 'TypeScript, React',
  experienceRequired: '3 - 5 years',
  type: 'full_time',
  workMode: EWorkMode.HYBRID,
  languagesRequired: ['Khmer', 'English'],
  location: 'Phnom Penh',
  ...partial,
});

describe('computeMatchScore', () => {
  it('scores a candidate who meets every stated requirement at 100', () => {
    const result = computeMatchScore(employee(), company([job()]));

    expect(result.score).toBe(100);
    expect(result.dimensions.map((d) => d.key).sort()).toEqual([
      'employmentType',
      'experience',
      'languages',
      'location',
      'skills',
      'workMode',
    ]);
  });

  it('returns null when the company has no open positions', () => {
    expect(computeMatchScore(employee(), company([])).score).toBeNull();
  });

  // A sparse posting should be judged on what it states, not punished for the
  // fields it left blank — otherwise every candidate looks like a poor fit.
  it('drops unstated dimensions instead of scoring them zero', () => {
    // Company location is cleared too, since an absent job location falls back
    // to it — otherwise the location dimension would still be comparable.
    const sparse = {
      location: null,
      openPositions: [
        {
          skillsRequired: 'TypeScript, React',
          experienceRequired: null,
          type: null,
          workMode: null,
          languagesRequired: null,
          location: null,
        },
      ],
    } as unknown as Company;

    const result = computeMatchScore(employee(), sparse);

    expect(result.dimensions.map((d) => d.key)).toEqual(['skills']);
    expect(result.score).toBe(100);
  });

  it('takes the best-fitting position, not the average', () => {
    const result = computeMatchScore(
      employee(),
      company([
        job({ skillsRequired: 'COBOL, Fortran', type: 'internship' }),
        job(),
      ]),
    );

    expect(result.score).toBe(100);
  });

  describe('experience', () => {
    it('gives full credit for meeting or exceeding the requirement', () => {
      const exceeds = computeMatchScore(
        employee({ yearsOfExperience: '10+ years' }),
        company([job({ experienceRequired: '1 - 2 years' })]),
      );
      expect(exceeds.score).toBe(100);
    });

    it('degrades by level rather than failing outright', () => {
      const oneBelow = computeMatchScore(
        employee({ yearsOfExperience: '1 - 2 years' }),
        company([job({ experienceRequired: '3 - 5 years' })]),
      );
      const threeBelow = computeMatchScore(
        employee({ yearsOfExperience: 'No Experience' }),
        company([job({ experienceRequired: '6 - 10 years' })]),
      );

      expect(oneBelow.score).toBeGreaterThan(threeBelow.score!);
      expect(oneBelow.score).toBeLessThan(100);
      expect(threeBelow.score).toBeGreaterThan(0);
    });

    // Rows that predate normalization hold free text the scale cannot rank.
    it('drops the dimension for unrecognized experience values', () => {
      const result = computeMatchScore(
        employee({ yearsOfExperience: 'Senior-ish' }),
        company([job()]),
      );
      expect(result.dimensions.map((d) => d.key)).not.toContain('experience');
    });
  });

  describe('employment type', () => {
    it('scores a genuine mismatch between two real types', () => {
      const result = computeMatchScore(
        employee({ availability: 'part_time' }),
        company([job({ type: 'full_time' })]),
      );
      expect(result.score).toBeLessThan(100);
      expect(result.dimensions.map((d) => d.key)).toContain('employmentType');
    });

    // Existing rows hold an `availability` of "available" or "Immediately",
    // which answers a different question entirely. Treating that as a mismatch
    // would cost real candidates the full weight of the dimension for a data
    // problem rather than a fit problem.
    it('drops the dimension when a side holds a non-employment-type value', () => {
      const result = computeMatchScore(
        employee({ availability: 'available' }),
        company([job({ type: 'full_time' })]),
      );

      expect(result.dimensions.map((d) => d.key)).not.toContain(
        'employmentType',
      );
      expect(result.score).toBe(100);
    });
  });

  describe('work mode', () => {
    it('treats flexible on either side as compatible with anything', () => {
      const candidateFlexible = computeMatchScore(
        employee({ workMode: EWorkMode.FLEXIBLE }),
        company([job({ workMode: EWorkMode.ON_SITE })]),
      );
      const roleFlexible = computeMatchScore(
        employee({ workMode: EWorkMode.REMOTE }),
        company([job({ workMode: EWorkMode.FLEXIBLE })]),
      );

      expect(candidateFlexible.score).toBe(100);
      expect(roleFlexible.score).toBe(100);
    });

    it('penalizes a genuine mismatch', () => {
      const result = computeMatchScore(
        employee({ workMode: EWorkMode.REMOTE }),
        company([job({ workMode: EWorkMode.ON_SITE })]),
      );
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('languages', () => {
    it('scores the share of required languages the candidate speaks', () => {
      const half = computeMatchScore(
        employee({ languages: ['Khmer'] }),
        company([job({ languagesRequired: ['Khmer', 'Japanese'] })]),
      );
      const dimension = half.dimensions.find((d) => d.key === 'languages');
      expect(dimension?.score).toBeCloseTo(0.5);
    });
  });

  describe('location', () => {
    // Where someone lives is irrelevant to a remote role, so it must not count
    // against them.
    it('is ignored for remote positions', () => {
      // Candidate is remote-willing too, so location is the only thing that
      // could differ — and it must not count.
      const result = computeMatchScore(
        employee({ location: 'Battambang', workMode: EWorkMode.REMOTE }),
        company([job({ workMode: EWorkMode.REMOTE, location: 'Phnom Penh' })]),
      );

      expect(result.dimensions.map((d) => d.key)).not.toContain('location');
      expect(result.score).toBe(100);
    });

    it('falls back to the company location when the job states none', () => {
      const result = computeMatchScore(
        employee({ location: 'Phnom Penh' }),
        company([job({ location: null })]),
      );
      expect(result.dimensions.map((d) => d.key)).toContain('location');
    });
  });

  it('weights skills most heavily of all dimensions', () => {
    const weights = Object.values(MATCH_WEIGHTS);
    expect(MATCH_WEIGHTS.skills).toBe(Math.max(...weights));
  });
});

describe('computeSkillScore', () => {
  it('reports skill overlap on its own, unaffected by other dimensions', () => {
    const score = computeSkillScore(
      employee({ workMode: EWorkMode.REMOTE, availability: 'part_time' }),
      company([job({ workMode: EWorkMode.ON_SITE, type: 'full_time' })]),
    );
    expect(score).toBe(100);
  });

  it('matches across skill spelling variants', () => {
    const score = computeSkillScore(
      employee({ skills: [{ name: 'NodeJS' }] as never }),
      company([job({ skillsRequired: 'Node.js' })]),
    );
    expect(score).toBe(100);
  });

  it('prefers the loaded relation over the legacy column', () => {
    const score = computeSkillScore(
      employee({ skills: [{ name: 'Go' }] as never }),
      company([
        { skillsRequired: 'TypeScript', requiredSkills: [{ name: 'Go' }] },
      ]),
    );
    expect(score).toBe(100);
  });

  it('distinguishes no data from a genuine zero', () => {
    expect(
      computeSkillScore(employee({ skills: [] }), company([job()])),
    ).toBeNull();
    expect(computeSkillScore(employee(), company([]))).toBeNull();
    expect(
      computeSkillScore(
        employee(),
        company([job({ skillsRequired: 'COBOL' })]),
      ),
    ).toBe(0);
  });
});
