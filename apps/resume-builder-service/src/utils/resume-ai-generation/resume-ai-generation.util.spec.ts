import { BuildResumeDTO } from '@app/contracts/dtos/resume';
import { RESUME_TEMPLATE_KEYS } from '@app/contracts/dtos/resume/generate-resume-from-text.dto';
import {
  buildFallbackResumeDesign,
  buildResumeGenerationInput,
  mergeGeneratedResumeContent,
  parseGeneratedResumeContent,
  parseGeneratedResumeDesign,
} from './resume-ai-generation.util';

function trustedResume(): BuildResumeDTO {
  return {
    personalInfo: {
      fullName: 'Sokha Chan',
      email: 'sokha@example.com',
      phone: '012345678',
      age: 28,
      job: 'Software Engineer',
      profilePicture: 'data:image/jpeg;base64,aGVsbG8=',
      socials: { linkedin: 'https://linkedin.example/sokha' },
    },
    summary: 'Existing summary',
    yearsOfExperience: '3 - 5 years',
    availability: 'Full time',
    experience: [
      {
        company: 'Apsara Labs',
        position: 'Software Engineer',
        startDate: 'January 2023',
        endDate: 'Present',
        description: 'Existing description',
        achievements: ['Existing achievement'],
      },
    ],
    skills: ['TypeScript'],
    education: 'BSc, Royal University, 2022',
    careerScopes: ['Backend Engineering'],
    sectionOrder: ['summary', 'experience', 'skills'],
    template: 'modern',
  };
}

describe('resume AI generation boundaries', () => {
  it('never sends identity, contact or avatar data to the model', () => {
    const input = buildResumeGenerationInput(trustedResume(), 8_000);

    expect(input).not.toContain('Sokha Chan');
    expect(input).not.toContain('sokha@example.com');
    expect(input).not.toContain('012345678');
    expect(input).not.toContain('data:image');
    expect(input).not.toContain('linkedin.example');
    expect(input).toContain('Software Engineer');
    expect(input).toContain('"selectedStyle":"modern"');
    expect(input.length).toBeLessThanOrEqual(8_000);
  });

  it('merges generated prose without changing verified facts', () => {
    const trusted = trustedResume();
    const result = mergeGeneratedResumeContent(trusted, {
      summary: 'AI-written professional summary',
      experience: [
        {
          index: 0,
          company: 'Invented Company',
          position: 'CTO',
          startDate: 'Yesterday',
          description: 'Built reliable product systems.',
          achievements: ['Improved delivery quality across the team.'],
        },
      ],
      skills: ['TypeScript', 'System Design'],
      education: 'BSc in Computer Science — Royal University, 2022',
      design: {
        layout: 'right-sidebar',
        columnRatio: 'narrow',
        headerLayout: 'split',
        avatarPlacement: 'start',
        sidebarSections: ['skills', 'education'],
        palette: 'violet',
        typography: 'geometric',
        density: 'spacious',
        headerStyle: 'solid',
        sectionStyle: 'pill',
        cornerStyle: 'rounded',
        experienceStyle: 'timeline',
        skillsStyle: 'grid',
        educationStyle: 'cards',
        summaryStyle: 'highlight',
        decoration: 'geometric',
      },
      personalInfo: { email: 'attacker@example.com' },
      template: 'dark',
    });

    expect(result.personalInfo).toEqual(trusted.personalInfo);
    expect(result.template).toBe('modern');
    expect(result.experience[0]).toMatchObject({
      company: 'Apsara Labs',
      position: 'Software Engineer',
      startDate: 'January 2023',
      endDate: 'Present',
      description: 'Built reliable product systems.',
      achievements: ['Improved delivery quality across the team.'],
    });
    expect(result.skills).toEqual(['TypeScript', 'System Design']);
    expect(result.summary).toBe('AI-written professional summary');
    expect(result.design).toEqual({
      layout: 'right-sidebar',
      columnRatio: 'narrow',
      headerLayout: 'split',
      avatarPlacement: 'start',
      sidebarSections: ['skills', 'education'],
      palette: 'violet',
      typography: 'geometric',
      density: 'spacious',
      headerStyle: 'solid',
      sectionStyle: 'pill',
      cornerStyle: 'rounded',
      experienceStyle: 'timeline',
      skillsStyle: 'grid',
      educationStyle: 'cards',
      summaryStyle: 'highlight',
      decoration: 'geometric',
    });
  });

  it('falls back to trusted content when generated fields are invalid', () => {
    const trusted = trustedResume();
    const result = mergeGeneratedResumeContent(trusted, {
      summary: 42,
      experience: [{ index: 50, description: 'Wrong row' }],
      skills: [null, '', 123],
      education: null,
    });

    expect(result.summary).toBe(trusted.summary);
    expect(result.experience).toEqual(trusted.experience);
    expect(result.skills).toEqual(trusted.skills);
    expect(result.education).toBe(trusted.education);
  });

  it('rejects non-object model output', () => {
    expect(() => parseGeneratedResumeContent('[]')).toThrow(
      'invalid resume structure',
    );
  });

  it('rejects raw or unsupported design values from the model', () => {
    const trusted = trustedResume();
    const result = mergeGeneratedResumeContent(trusted, {
      design: {
        layout: 'left-sidebar',
        columnRatio: 'wide',
        headerLayout: 'centered',
        avatarPlacement: 'center',
        sidebarSections: ['summary'],
        palette: '#ff0000',
        typography: 'https://fonts.example/unsafe.woff',
        density: 'balanced',
        headerStyle: 'solid',
        sectionStyle: '<style>body{display:none}</style>',
        cornerStyle: 'rounded',
        experienceStyle: 'cards',
        skillsStyle: 'chips',
        educationStyle: 'timeline',
        summaryStyle: 'quote',
        decoration: 'top-band',
      },
    });

    expect(result.design).toBeUndefined();
  });

  it('always provides a varied style-compatible fallback blueprint', () => {
    const first = buildFallbackResumeDesign('compact', 123);
    const repeated = buildFallbackResumeDesign('compact', 123);
    const different = buildFallbackResumeDesign('compact', 456);

    expect(first).toEqual(repeated);
    expect(first).not.toEqual(different);
    expect(first.density).toBe('compact');
    expect(['two-column', 'left-sidebar', 'right-sidebar']).toContain(
      first.layout,
    );
    expect(buildFallbackResumeDesign('dark', 123).palette).toBe('midnight');
  });
});

describe('per-template fallback design spaces', () => {
  it('produces only valid design values for every template', () => {
    for (const template of RESUME_TEMPLATE_KEYS) {
      for (let seed = 0; seed < 40; seed += 1) {
        const design = buildFallbackResumeDesign(template, seed);
        // Round-trip through the same validator used for AI output:
        // every sampled value must be an allowed enum member.
        expect(parseGeneratedResumeDesign(design)).toEqual(design);
      }
    }
  });

  it('varies the design across seeds for every template', () => {
    for (const template of RESUME_TEMPLATE_KEYS) {
      const signatures = new Set(
        Array.from({ length: 60 }, (_, seed) =>
          JSON.stringify(buildFallbackResumeDesign(template, seed)),
        ),
      );
      expect(signatures.size).toBeGreaterThan(5);
    }
  });

  it('keeps the timeline template on timeline experience styling', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      expect(buildFallbackResumeDesign('timeline', seed).experienceStyle).toBe(
        'timeline',
      );
    }
  });

  it('rejects malformed JSON and malformed design containers', () => {
    expect(() => parseGeneratedResumeContent('{not-json')).toThrow(SyntaxError);
    expect(parseGeneratedResumeDesign(null)).toBeUndefined();
    expect(parseGeneratedResumeDesign([])).toBeUndefined();

    const valid = buildFallbackResumeDesign('modern', 12);
    expect(
      parseGeneratedResumeDesign({
        ...valid,
        sidebarSections: ['skills', 'skills'],
      }),
    ).toBeUndefined();
    expect(
      parseGeneratedResumeDesign({
        ...valid,
        sidebarSections: [],
      }),
    ).toBeUndefined();
  });

  it('clips oversized generation input in every reduction stage', () => {
    const trusted = trustedResume();
    trusted.summary = 's'.repeat(2_000);
    trusted.education = 'e'.repeat(2_000);
    trusted.skills = Array.from({ length: 30 }, (_, index) => `skill-${index}`);
    trusted.experience = Array.from({ length: 6 }, (_, index) => ({
      company: `Company ${index}`,
      position: `Position ${index}`,
      startDate: '2020',
      endDate: '2026',
      description: 'description'.repeat(50),
      achievements: ['achievement'.repeat(30)],
    }));

    const parsed = JSON.parse(
      buildResumeGenerationInput(trusted, 700),
    ) as Record<string, any>;

    expect(parsed.experience).toHaveLength(1);
    expect(parsed.currentSkills.length).toBeLessThanOrEqual(5);
    expect(parsed.currentSummary.length).toBeLessThanOrEqual(200);
    expect(parsed.education.length).toBeLessThanOrEqual(300);
  });

  it('ignores malformed experience suggestions and deduplicates bounded skills', () => {
    const trusted = trustedResume();
    const generatedSkills = Array.from(
      { length: 140 },
      (_, index) => `Skill ${index}`,
    );
    const result = mergeGeneratedResumeContent(trusted, {
      experience: [
        null,
        'invalid',
        { index: 0.5, description: 'fractional' },
        { index: -1, description: 'negative' },
        {
          index: 0,
          description: 'x'.repeat(5_001),
          achievements: [' ', 12, 'Valid achievement'],
        },
      ],
      skills: ['typescript', ...generatedSkills],
    });

    expect(result.experience[0].description).toBe(
      trusted.experience[0].description,
    );
    expect(result.experience[0].achievements).toEqual(['Valid achievement']);
    expect(result.skills.filter((skill) => /typescript/i.test(skill))).toEqual([
      'TypeScript',
    ]);
    expect(result.skills).toHaveLength(100);
  });
});
