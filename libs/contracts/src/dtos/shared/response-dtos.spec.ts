import 'reflect-metadata';
import {
  AiMatchProfilesDTO,
  AiMatchProfilesResponseDTO,
} from '../job/matching/ai-match-profiles.dto';
import {
  CareerScopesResponseDTO,
  CompanyResponseDTO,
  EducationResponseDTO,
  EmployeeResponseDTO,
  ExperienceResponseDTO,
  ImageResponseDTO,
  JobPositionResponseDTO,
  SkillResponseDTO,
  SocialResponseDTO,
  UserResponseDTO,
  ValuesAndBenefitsResponseDTO,
} from './user.dto';

describe('shared response DTO mappings', () => {
  it('assigns simple profile response values', () => {
    const cases = [
      [SkillResponseDTO, { name: 'TypeScript' }],
      [ExperienceResponseDTO, { title: 'Engineer' }],
      [EducationResponseDTO, { school: 'RUPP' }],
      [SocialResponseDTO, { platform: 'GitHub' }],
      [ImageResponseDTO, { image: '/image.png' }],
      [ValuesAndBenefitsResponseDTO, { label: 'Remote' }],
      [CareerScopesResponseDTO, { name: 'Software' }],
      [AiMatchProfilesDTO, { eid: 'employee-1', cid: 'company-1' }],
      [
        AiMatchProfilesResponseDTO,
        { employeeProfile: { id: 1 }, companyProfile: { id: 2 } },
      ],
    ] as const;

    for (const [Dto, values] of cases) {
      expect(new (Dto as any)(values)).toEqual(expect.objectContaining(values));
    }
  });

  it('maps job getters, dates, and comma-separated skills', () => {
    const job = new JobPositionResponseDTO({
      experienceRequired: '3 years',
      educationRequired: 'Bachelor',
      skillsRequired: 'TypeScript, PostgreSQL',
      expireDate: new Date('2026-08-01T00:00:00Z'),
      createdAt: new Date('2026-07-01T00:00:00Z'),
    });
    expect(job.experience).toBe('3 years');
    expect(job.education).toBe('Bachelor');
    expect(job.skills).toEqual(['TypeScript', 'PostgreSQL']);
    expect(job.deadlineDate).toBeTruthy();
    expect(job.postedDate).toBeTruthy();

    const undated = new JobPositionResponseDTO({
      skillsRequired: '',
      expireDate: null as any,
      createdAt: null as any,
    });
    expect(undated.deadlineDate).toBeNull();
    expect(undated.postedDate).toBeNull();
  });

  it('deduplicates company availability and handles missing positions', () => {
    expect(
      new CompanyResponseDTO({
        openPositions: [
          { type: 'full-time' },
          { type: 'full-time' },
          { type: 'contract' },
        ] as any,
      }).availableTimes,
    ).toEqual(['full-time', 'contract']);
    expect(new CompanyResponseDTO({}).availableTimes).toEqual([]);
  });

  it('wraps plain nested profiles but preserves existing DTO instances', () => {
    const plain = new UserResponseDTO({
      id: 'user-1',
      employee: { id: 'employee-1' } as EmployeeResponseDTO,
      company: { id: 'company-1' } as CompanyResponseDTO,
    });
    expect(plain.employee).toBeInstanceOf(EmployeeResponseDTO);
    expect(plain.company).toBeInstanceOf(CompanyResponseDTO);

    const employee = new EmployeeResponseDTO({ id: 'employee-2' });
    const company = new CompanyResponseDTO({ id: 'company-2' });
    const existing = new UserResponseDTO({ employee, company });
    expect(existing.employee).toBe(employee);
    expect(existing.company).toBe(company);
    expect(new UserResponseDTO({ id: 'user-3' })).toEqual({ id: 'user-3' });
  });
});
