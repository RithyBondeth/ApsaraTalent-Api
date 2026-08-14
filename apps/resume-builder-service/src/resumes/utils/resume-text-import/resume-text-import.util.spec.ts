import {
  parseResumeFromTextOutput,
  RESUME_TEXT_IMPORT_JSON_SCHEMA,
} from './resume-text-import.util';

const design = {
  layout: 'right-sidebar',
  columnRatio: 'narrow',
  headerLayout: 'split',
  avatarPlacement: 'start',
  sidebarSections: ['skills', 'education'],
  palette: 'cobalt',
  typography: 'humanist',
  density: 'balanced',
  headerStyle: 'soft',
  sectionStyle: 'line',
  cornerStyle: 'soft',
  experienceStyle: 'plain',
  skillsStyle: 'chips',
  educationStyle: 'plain',
  summaryStyle: 'highlight',
  decoration: 'side-band',
};

describe('resume text import boundaries', () => {
  it('normalizes extracted facts into the builder contract', () => {
    const result = parseResumeFromTextOutput(
      JSON.stringify({
        personalInfo: {
          fullName: '  Sokha Chan  ',
          email: 'sokha@example.com',
          phone: '012 345 678',
          location: 'Phnom Penh',
          age: 28,
          job: 'Software Engineer',
          socials: [
            { platform: 'LinkedIn', url: 'https://linkedin.com/in/sokha' },
          ],
        },
        summary: 'Software engineer focused on reliable products.',
        yearsOfExperience: '5 years',
        availability: 'Full time',
        experience: [
          {
            company: 'Apsara Labs',
            position: 'Software Engineer',
            startDate: '2022',
            endDate: 'Present',
            description: 'Built product features.',
            achievements: ['Improved release quality.'],
          },
        ],
        skills: ['TypeScript', 'typescript', 'Communication'],
        education: 'BSc Computer Science, RUPP, 2022',
        careerScopes: ['Backend Engineering'],
        design,
      }),
      'professional',
      123,
    );

    expect(result.personalInfo).toEqual({
      fullName: 'Sokha Chan',
      email: 'sokha@example.com',
      phone: '012 345 678',
      location: 'Phnom Penh',
      age: 28,
      job: 'Software Engineer',
      socials: { linkedin: 'https://linkedin.com/in/sokha' },
    });
    expect(result.skills).toEqual(['TypeScript', 'Communication']);
    expect(result.experience[0]).toMatchObject({
      company: 'Apsara Labs',
      position: 'Software Engineer',
      startDate: '2022',
      endDate: 'Present',
    });
    expect(result.template).toBe('professional');
    expect(result.design).toEqual(design);
  });

  it('drops invalid contact data and falls back from an unsafe design', () => {
    const result = parseResumeFromTextOutput(
      JSON.stringify({
        personalInfo: {
          fullName: 'Candidate',
          email: 'not-an-email',
          age: 8,
          socials: [{ platform: '<script>', url: 'bad' }],
        },
        design: { ...design, palette: '#ff0000' },
      }),
      'dark',
      456,
    );

    expect(result.personalInfo.email).toBe('');
    expect(result.personalInfo.age).toBeUndefined();
    expect(result.personalInfo.socials).toBeUndefined();
    expect(result.design?.palette).toBe('midnight');
  });

  it('defines a strict root schema for model output', () => {
    expect(RESUME_TEXT_IMPORT_JSON_SCHEMA).toMatchObject({
      type: 'object',
      additionalProperties: false,
    });
    expect(RESUME_TEXT_IMPORT_JSON_SCHEMA.required).toContain('personalInfo');
    expect(RESUME_TEXT_IMPORT_JSON_SCHEMA.required).toContain('design');
  });

  it('rejects non-object model output', () => {
    expect(() => parseResumeFromTextOutput('[]', 'modern', 123)).toThrow(
      'invalid imported resume',
    );
  });
});
