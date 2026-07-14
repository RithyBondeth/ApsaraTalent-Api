import { BuildResumeDTO } from '@app/contracts/dtos/resume';

type UnknownRecord = Record<string, unknown>;
type ResumeDesign = NonNullable<BuildResumeDTO['design']>;
type ResumeTemplate = BuildResumeDTO['template'];

interface StylePreset {
  layouts: readonly ResumeDesign['layout'][];
  palettes: readonly ResumeDesign['palette'][];
  typography: readonly ResumeDesign['typography'][];
  densities?: readonly ResumeDesign['density'][];
}

const STYLE_PRESETS: Record<ResumeTemplate, StylePreset> = {
  modern: {
    layouts: ['two-column', 'right-sidebar', 'left-sidebar'],
    palettes: ['cobalt', 'ocean', 'graphite'],
    typography: ['geometric', 'sans', 'humanist'],
  },
  classic: {
    layouts: ['single', 'two-column'],
    palettes: ['graphite', 'sand', 'cobalt'],
    typography: ['serif'],
  },
  creative: {
    layouts: ['two-column', 'left-sidebar', 'right-sidebar'],
    palettes: ['violet', 'rose', 'amber', 'ocean'],
    typography: ['geometric', 'humanist'],
  },
  minimalist: {
    layouts: ['single', 'two-column'],
    palettes: ['graphite', 'ocean', 'cobalt'],
    typography: ['sans', 'humanist'],
  },
  timeline: {
    layouts: ['left-sidebar', 'right-sidebar', 'two-column'],
    palettes: ['cobalt', 'violet', 'emerald'],
    typography: ['humanist', 'sans'],
  },
  bold: {
    layouts: ['left-sidebar', 'right-sidebar', 'two-column'],
    palettes: ['rose', 'graphite', 'cobalt'],
    typography: ['geometric', 'sans'],
  },
  compact: {
    layouts: ['two-column', 'left-sidebar', 'right-sidebar'],
    palettes: ['cobalt', 'graphite', 'ocean'],
    typography: ['sans', 'humanist'],
    densities: ['compact'],
  },
  elegant: {
    layouts: ['single', 'two-column', 'right-sidebar'],
    palettes: ['sand', 'violet', 'rose'],
    typography: ['serif', 'humanist'],
  },
  colorful: {
    layouts: ['two-column', 'left-sidebar', 'right-sidebar'],
    palettes: ['emerald', 'violet', 'rose', 'amber', 'ocean'],
    typography: ['geometric', 'humanist'],
  },
  professional: {
    layouts: ['right-sidebar', 'two-column', 'single'],
    palettes: ['cobalt', 'ocean', 'graphite'],
    typography: ['humanist', 'sans'],
  },
  corporate: {
    layouts: ['two-column', 'right-sidebar', 'left-sidebar'],
    palettes: ['cobalt', 'graphite', 'ocean'],
    typography: ['sans', 'humanist'],
  },
  dark: {
    layouts: ['right-sidebar', 'left-sidebar', 'two-column'],
    palettes: ['midnight'],
    typography: ['mono', 'sans'],
  },
};

function seededPick<T>(values: readonly T[], seed: number, salt: number): T {
  const index = ((seed ^ Math.imul(salt, 0x9e3779b9)) >>> 0) % values.length;
  return values[index];
}

/** Ensure every successful generation has a varied, style-compatible layout. */
export function buildFallbackResumeDesign(
  template: ResumeTemplate,
  seed: number,
): ResumeDesign {
  const preset = STYLE_PRESETS[template];
  const sidebarOptions: readonly ResumeDesign['sidebarSections'][] = [
    ['skills'],
    ['skills', 'education'],
    ['summary', 'skills'],
    ['education', 'careerScopes'],
    ['skills', 'careerScopes'],
  ];

  return {
    layout: seededPick(preset.layouts, seed, 1),
    columnRatio: seededPick(['narrow', 'balanced', 'wide'], seed, 2),
    headerLayout: seededPick(
      ['stacked', 'split', 'centered', 'compact'],
      seed,
      3,
    ),
    avatarPlacement: seededPick(['start', 'center', 'end'], seed, 4),
    sidebarSections: [
      ...seededPick(sidebarOptions, seed, 5),
    ] as ResumeDesign['sidebarSections'],
    palette: seededPick(preset.palettes, seed, 6),
    typography: seededPick(preset.typography, seed, 7),
    density: seededPick(
      preset.densities ?? ['compact', 'balanced', 'spacious'],
      seed,
      8,
    ),
    headerStyle: seededPick(['solid', 'soft', 'minimal'], seed, 9),
    sectionStyle: seededPick(['line', 'bar', 'pill', 'plain'], seed, 10),
    cornerStyle: seededPick(['square', 'soft', 'rounded'], seed, 11),
    experienceStyle: seededPick(['plain', 'cards', 'timeline'], seed, 12),
    skillsStyle: seededPick(['chips', 'grid', 'list'], seed, 13),
    educationStyle: seededPick(['plain', 'cards', 'timeline'], seed, 14),
    summaryStyle: seededPick(['plain', 'highlight', 'quote'], seed, 15),
    decoration: seededPick(
      ['none', 'top-band', 'side-band', 'geometric'],
      seed,
      16,
    ),
  };
}

const DESIGN_OPTIONS = {
  layout: new Set(['single', 'two-column', 'left-sidebar', 'right-sidebar']),
  columnRatio: new Set(['narrow', 'balanced', 'wide']),
  headerLayout: new Set(['stacked', 'split', 'centered', 'compact']),
  avatarPlacement: new Set(['start', 'center', 'end']),
  palette: new Set([
    'ocean',
    'cobalt',
    'violet',
    'emerald',
    'amber',
    'rose',
    'graphite',
    'midnight',
    'sand',
  ]),
  typography: new Set(['sans', 'serif', 'geometric', 'humanist', 'mono']),
  density: new Set(['compact', 'balanced', 'spacious']),
  headerStyle: new Set(['solid', 'soft', 'minimal']),
  sectionStyle: new Set(['line', 'bar', 'pill', 'plain']),
  cornerStyle: new Set(['square', 'soft', 'rounded']),
  experienceStyle: new Set(['plain', 'cards', 'timeline']),
  skillsStyle: new Set(['chips', 'grid', 'list']),
  educationStyle: new Set(['plain', 'cards', 'timeline']),
  summaryStyle: new Set(['plain', 'highlight', 'quote']),
  decoration: new Set(['none', 'top-band', 'side-band', 'geometric']),
} as const;

const SIDEBAR_SECTIONS = new Set<string>([
  'summary',
  'skills',
  'education',
  'careerScopes',
]);

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function boundedText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text && text.length <= maxLength ? text : undefined;
}

function boundedTextArray(
  value: unknown,
  maxItems: number,
  maxLength: number,
): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => boundedText(item, maxLength))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems);
}

function dedupeCaseInsensitive(values: string[], maxItems: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= maxItems) break;
  }
  return result;
}

function clip(value: string | undefined, maxLength: number): string {
  return (value ?? '').trim().slice(0, maxLength);
}

export function parseGeneratedResumeDesign(
  value: unknown,
): BuildResumeDTO['design'] | undefined {
  const design = asRecord(value);
  if (!design) return undefined;
  for (const [key, allowed] of Object.entries(DESIGN_OPTIONS)) {
    if (typeof design[key] !== 'string' || !allowed.has(design[key] as never)) {
      return undefined;
    }
  }

  if (
    !Array.isArray(design.sidebarSections) ||
    design.sidebarSections.length < 1 ||
    design.sidebarSections.length > 4 ||
    design.sidebarSections.some(
      (section) =>
        typeof section !== 'string' || !SIDEBAR_SECTIONS.has(section),
    ) ||
    new Set(design.sidebarSections).size !== design.sidebarSections.length
  ) {
    return undefined;
  }

  return {
    layout: design.layout as NonNullable<BuildResumeDTO['design']>['layout'],
    columnRatio: design.columnRatio as NonNullable<
      BuildResumeDTO['design']
    >['columnRatio'],
    headerLayout: design.headerLayout as NonNullable<
      BuildResumeDTO['design']
    >['headerLayout'],
    avatarPlacement: design.avatarPlacement as NonNullable<
      BuildResumeDTO['design']
    >['avatarPlacement'],
    sidebarSections: [...design.sidebarSections] as NonNullable<
      BuildResumeDTO['design']
    >['sidebarSections'],
    palette: design.palette as NonNullable<BuildResumeDTO['design']>['palette'],
    typography: design.typography as NonNullable<
      BuildResumeDTO['design']
    >['typography'],
    density: design.density as NonNullable<BuildResumeDTO['design']>['density'],
    headerStyle: design.headerStyle as NonNullable<
      BuildResumeDTO['design']
    >['headerStyle'],
    sectionStyle: design.sectionStyle as NonNullable<
      BuildResumeDTO['design']
    >['sectionStyle'],
    cornerStyle: design.cornerStyle as NonNullable<
      BuildResumeDTO['design']
    >['cornerStyle'],
    experienceStyle: design.experienceStyle as NonNullable<
      BuildResumeDTO['design']
    >['experienceStyle'],
    skillsStyle: design.skillsStyle as NonNullable<
      BuildResumeDTO['design']
    >['skillsStyle'],
    educationStyle: design.educationStyle as NonNullable<
      BuildResumeDTO['design']
    >['educationStyle'],
    summaryStyle: design.summaryStyle as NonNullable<
      BuildResumeDTO['design']
    >['summaryStyle'],
    decoration: design.decoration as NonNullable<
      BuildResumeDTO['design']
    >['decoration'],
  };
}

/**
 * Build a compact, non-sensitive model input. Contact details, social links,
 * avatar data, age and the candidate's name intentionally never reach OpenAI.
 */
export function buildResumeGenerationInput(
  resume: BuildResumeDTO,
  maxCharacters: number,
): string {
  const input = {
    selectedStyle: resume.template,
    targetRole: clip(resume.personalInfo.job, 180),
    currentSummary: clip(resume.summary, 600),
    yearsOfExperience: clip(resume.yearsOfExperience, 100),
    availability: clip(resume.availability, 120),
    experience: resume.experience.slice(0, 6).map((experience, index) => ({
      index,
      position: clip(experience.position, 180),
      company: clip(experience.company, 180),
      startDate: clip(experience.startDate, 60),
      endDate: clip(experience.endDate, 60),
      currentDescription: clip(experience.description, 320),
      currentAchievements: experience.achievements
        .slice(0, 3)
        .map((achievement) => clip(achievement, 140)),
    })),
    currentSkills: resume.skills.slice(0, 30).map((skill) => clip(skill, 80)),
    education: clip(resume.education, 800),
    careerInterests: (resume.careerScopes ?? [])
      .slice(0, 20)
      .map((scope) => clip(scope, 100)),
  };

  let serialized = JSON.stringify(input);
  while (serialized.length > maxCharacters && input.experience.length > 1) {
    input.experience.pop();
    serialized = JSON.stringify(input);
  }
  while (serialized.length > maxCharacters && input.currentSkills.length > 5) {
    input.currentSkills.pop();
    serialized = JSON.stringify(input);
  }
  if (serialized.length > maxCharacters) {
    input.currentSummary = clip(input.currentSummary, 200);
    input.education = clip(input.education, 300);
    serialized = JSON.stringify(input);
  }

  return serialized;
}

export function parseGeneratedResumeContent(content: string): UnknownRecord {
  const parsed: unknown = JSON.parse(content);
  const result = asRecord(parsed);
  if (!result) throw new Error('AI returned an invalid resume structure');
  return result;
}

/**
 * Merge only model-authored prose into the trusted profile snapshot. Identity,
 * contact details, employers, job titles, dates, template and layout stay exact.
 */
export function mergeGeneratedResumeContent(
  trusted: BuildResumeDTO,
  generated: UnknownRecord,
): BuildResumeDTO {
  const generatedExperience = new Map<number, UnknownRecord>();
  if (Array.isArray(generated.experience)) {
    for (const value of generated.experience) {
      const item = asRecord(value);
      if (!item || !Number.isInteger(item.index)) continue;
      const index = item.index as number;
      if (index < 0 || index >= trusted.experience.length) continue;
      generatedExperience.set(index, item);
    }
  }

  const experience = trusted.experience.map((source, index) => {
    const suggestion = generatedExperience.get(index);
    const description = boundedText(suggestion?.description, 5_000);
    const achievements = boundedTextArray(suggestion?.achievements, 30, 1_000);
    return {
      ...source,
      description: description ?? source.description,
      achievements:
        achievements.length > 0 ? achievements : [...source.achievements],
    };
  });

  const trustedSkills = boundedTextArray(trusted.skills, 100, 100);
  const generatedSkills = boundedTextArray(generated.skills, 100, 100);
  const skills = dedupeCaseInsensitive(
    [...trustedSkills, ...generatedSkills],
    100,
  );

  return {
    ...trusted,
    personalInfo: {
      ...trusted.personalInfo,
      socials: trusted.personalInfo.socials
        ? { ...trusted.personalInfo.socials }
        : undefined,
    },
    summary: boundedText(generated.summary, 5_000) ?? trusted.summary,
    experience,
    skills,
    education: boundedText(generated.education, 5_000) ?? trusted.education,
    careerScopes: trusted.careerScopes ? [...trusted.careerScopes] : undefined,
    sectionOrder: trusted.sectionOrder ? [...trusted.sectionOrder] : undefined,
    design: parseGeneratedResumeDesign(generated.design) ?? trusted.design,
  };
}
