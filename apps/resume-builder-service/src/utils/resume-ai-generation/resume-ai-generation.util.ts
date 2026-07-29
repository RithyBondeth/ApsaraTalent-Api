import { BuildResumeDTO } from '@app/contracts/dtos/resume';

type TUnknownRecord = Record<string, unknown>;
type TResumeDesign = NonNullable<BuildResumeDTO['design']>;
type TResumeTemplate = BuildResumeDTO['template'];

/**
 * Per-template design space. Every field the fallback generator samples can be
 * constrained per template so variation stays inside the template's identity;
 * omitted fields fall back to the full range of valid values.
 */
interface IStylePreset {
  layouts: readonly TResumeDesign['layout'][];
  palettes: readonly TResumeDesign['palette'][];
  typography: readonly TResumeDesign['typography'][];
  densities?: readonly TResumeDesign['density'][];
  headerLayouts?: readonly TResumeDesign['headerLayout'][];
  headerStyles?: readonly TResumeDesign['headerStyle'][];
  sectionStyles?: readonly TResumeDesign['sectionStyle'][];
  cornerStyles?: readonly TResumeDesign['cornerStyle'][];
  experienceStyles?: readonly TResumeDesign['experienceStyle'][];
  skillsStyles?: readonly TResumeDesign['skillsStyle'][];
  educationStyles?: readonly TResumeDesign['educationStyle'][];
  summaryStyles?: readonly TResumeDesign['summaryStyle'][];
  decorations?: readonly TResumeDesign['decoration'][];
}

const STYLE_PRESETS: Record<TResumeTemplate, IStylePreset> = {
  modern: {
    layouts: ['two-column', 'right-sidebar', 'left-sidebar'],
    palettes: ['cobalt', 'ocean', 'graphite'],
    typography: ['geometric', 'sans', 'humanist'],
    sectionStyles: ['line', 'bar'],
    decorations: ['none', 'top-band', 'side-band'],
  },
  classic: {
    layouts: ['single', 'two-column'],
    palettes: ['graphite', 'sand', 'cobalt'],
    typography: ['serif'],
    headerStyles: ['minimal', 'soft'],
    sectionStyles: ['line', 'plain'],
    cornerStyles: ['square', 'soft'],
    experienceStyles: ['plain', 'timeline'],
    summaryStyles: ['plain', 'quote'],
    decorations: ['none'],
  },
  creative: {
    layouts: ['two-column', 'left-sidebar', 'right-sidebar'],
    palettes: ['violet', 'rose', 'amber', 'ocean'],
    typography: ['geometric', 'humanist'],
    sectionStyles: ['pill', 'bar'],
    cornerStyles: ['rounded', 'soft'],
    decorations: ['geometric', 'side-band', 'top-band'],
  },
  minimalist: {
    layouts: ['single', 'two-column'],
    palettes: ['graphite', 'ocean', 'cobalt'],
    typography: ['sans', 'humanist'],
    densities: ['balanced', 'spacious'],
    headerStyles: ['minimal'],
    sectionStyles: ['plain', 'line'],
    skillsStyles: ['list', 'chips'],
    decorations: ['none'],
  },
  timeline: {
    layouts: ['left-sidebar', 'right-sidebar', 'two-column'],
    palettes: ['cobalt', 'violet', 'emerald'],
    typography: ['humanist', 'sans'],
    sectionStyles: ['line', 'bar'],
    experienceStyles: ['timeline'],
    educationStyles: ['timeline', 'plain'],
  },
  bold: {
    layouts: ['left-sidebar', 'right-sidebar', 'two-column'],
    palettes: ['rose', 'graphite', 'cobalt'],
    typography: ['geometric', 'sans'],
    headerStyles: ['solid'],
    sectionStyles: ['bar', 'pill'],
    cornerStyles: ['square', 'soft'],
    decorations: ['top-band', 'side-band', 'geometric'],
  },
  compact: {
    layouts: ['two-column', 'left-sidebar', 'right-sidebar'],
    palettes: ['cobalt', 'graphite', 'ocean'],
    typography: ['sans', 'humanist'],
    densities: ['compact'],
    headerLayouts: ['compact', 'split'],
    sectionStyles: ['line', 'plain'],
    decorations: ['none'],
  },
  elegant: {
    layouts: ['single', 'two-column', 'right-sidebar'],
    palettes: ['sand', 'violet', 'rose'],
    typography: ['serif', 'humanist'],
    headerStyles: ['soft', 'minimal'],
    sectionStyles: ['line', 'plain'],
    cornerStyles: ['soft', 'rounded'],
    summaryStyles: ['quote', 'highlight'],
    decorations: ['none', 'top-band'],
  },
  colorful: {
    layouts: ['two-column', 'left-sidebar', 'right-sidebar'],
    palettes: ['emerald', 'violet', 'rose', 'amber', 'ocean'],
    typography: ['geometric', 'humanist'],
    sectionStyles: ['pill', 'bar'],
    cornerStyles: ['rounded', 'soft'],
    skillsStyles: ['chips', 'grid'],
  },
  professional: {
    layouts: ['right-sidebar', 'two-column', 'single'],
    palettes: ['cobalt', 'ocean', 'graphite'],
    typography: ['humanist', 'sans'],
    sectionStyles: ['line', 'bar'],
    summaryStyles: ['plain', 'highlight'],
    decorations: ['none', 'top-band'],
  },
  corporate: {
    layouts: ['two-column', 'right-sidebar', 'left-sidebar'],
    palettes: ['cobalt', 'graphite', 'ocean'],
    typography: ['sans', 'humanist'],
    headerLayouts: ['split', 'stacked'],
    headerStyles: ['solid'],
    sectionStyles: ['bar', 'line'],
    cornerStyles: ['square', 'soft'],
    experienceStyles: ['plain', 'cards'],
    decorations: ['none', 'top-band'],
  },
  dark: {
    layouts: ['right-sidebar', 'left-sidebar', 'two-column'],
    palettes: ['midnight'],
    typography: ['mono', 'sans'],
    headerStyles: ['solid', 'minimal'],
    sectionStyles: ['bar', 'line'],
    decorations: ['none', 'side-band'],
  },
  executive: {
    layouts: ['single', 'right-sidebar'],
    palettes: ['graphite', 'midnight', 'sand'],
    typography: ['serif', 'humanist'],
    densities: ['balanced', 'spacious'],
    headerLayouts: ['split', 'stacked'],
    headerStyles: ['solid', 'minimal'],
    sectionStyles: ['line', 'bar'],
    cornerStyles: ['square', 'soft'],
    experienceStyles: ['plain', 'cards'],
    summaryStyles: ['quote', 'plain'],
    decorations: ['none', 'top-band'],
  },
  tech: {
    layouts: ['left-sidebar', 'two-column'],
    palettes: ['emerald', 'midnight', 'cobalt'],
    typography: ['mono', 'geometric'],
    headerStyles: ['solid', 'minimal'],
    sectionStyles: ['bar', 'plain'],
    cornerStyles: ['square', 'soft'],
    experienceStyles: ['plain', 'timeline'],
    skillsStyles: ['grid', 'chips'],
    decorations: ['none', 'side-band'],
  },
  academic: {
    layouts: ['single'],
    palettes: ['ocean', 'graphite', 'cobalt'],
    typography: ['serif'],
    densities: ['balanced', 'spacious'],
    headerLayouts: ['centered', 'stacked'],
    headerStyles: ['minimal', 'soft'],
    sectionStyles: ['line', 'plain'],
    cornerStyles: ['square', 'soft'],
    experienceStyles: ['plain'],
    skillsStyles: ['list'],
    decorations: ['none'],
  },
  startup: {
    layouts: ['two-column', 'left-sidebar', 'right-sidebar'],
    palettes: ['amber', 'rose', 'emerald', 'violet'],
    typography: ['geometric', 'humanist'],
    headerStyles: ['soft', 'solid'],
    sectionStyles: ['pill', 'bar'],
    cornerStyles: ['rounded'],
    skillsStyles: ['chips', 'grid'],
    summaryStyles: ['highlight', 'plain'],
    decorations: ['geometric', 'top-band', 'side-band'],
  },
  swiss: {
    layouts: ['single', 'two-column'],
    palettes: ['rose', 'graphite'],
    typography: ['geometric', 'sans'],
    densities: ['balanced', 'compact'],
    headerLayouts: ['split', 'stacked'],
    headerStyles: ['minimal', 'solid'],
    sectionStyles: ['bar'],
    cornerStyles: ['square'],
    skillsStyles: ['grid', 'list'],
    decorations: ['none', 'top-band'],
  },
  pastel: {
    layouts: ['right-sidebar', 'two-column', 'single'],
    palettes: ['sand', 'rose', 'ocean'],
    typography: ['humanist', 'sans'],
    densities: ['balanced', 'spacious'],
    headerStyles: ['soft'],
    sectionStyles: ['pill', 'line'],
    cornerStyles: ['rounded', 'soft'],
    skillsStyles: ['chips'],
    summaryStyles: ['highlight', 'plain'],
    decorations: ['none', 'top-band'],
  },
};

/**
 * One-line style intent per template, shared by both AI prompts so new
 * templates only need to be described once.
 */
export const RESUME_TEMPLATE_STYLE_HINTS =
  'modern is clean/geometric; classic is restrained/serif; creative is expressive; ' +
  'minimalist is sparse; timeline emphasizes chronology; bold is high-contrast; ' +
  'compact is dense; elegant is refined/serif; colorful is vibrant; ' +
  'professional is conservative; corporate is formal; dark uses a midnight palette; ' +
  'executive is stately serif with restrained warmth; tech is terminal-inspired ' +
  'monospace with emerald tones; academic is understated scholarly serif; ' +
  'startup is energetic, rounded and warm; swiss is precise grid-driven minimalism ' +
  'with a single strong accent; pastel is soft, friendly and rounded';

function seededPick<T>(values: readonly T[], seed: number, salt: number): T {
  const index = ((seed ^ Math.imul(salt, 0x9e3779b9)) >>> 0) % values.length;
  return values[index];
}

/** Ensure every successful generation has a varied, style-compatible layout. */
export function buildFallbackResumeDesign(
  template: TResumeTemplate,
  seed: number,
): TResumeDesign {
  const preset = STYLE_PRESETS[template];
  const sidebarOptions: readonly TResumeDesign['sidebarSections'][] = [
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
      preset.headerLayouts ?? ['stacked', 'split', 'centered', 'compact'],
      seed,
      3,
    ),
    avatarPlacement: seededPick(['start', 'center', 'end'], seed, 4),
    sidebarSections: [
      ...seededPick(sidebarOptions, seed, 5),
    ] as TResumeDesign['sidebarSections'],
    palette: seededPick(preset.palettes, seed, 6),
    typography: seededPick(preset.typography, seed, 7),
    density: seededPick(
      preset.densities ?? ['compact', 'balanced', 'spacious'],
      seed,
      8,
    ),
    headerStyle: seededPick(
      preset.headerStyles ?? ['solid', 'soft', 'minimal'],
      seed,
      9,
    ),
    sectionStyle: seededPick(
      preset.sectionStyles ?? ['line', 'bar', 'pill', 'plain'],
      seed,
      10,
    ),
    cornerStyle: seededPick(
      preset.cornerStyles ?? ['square', 'soft', 'rounded'],
      seed,
      11,
    ),
    experienceStyle: seededPick(
      preset.experienceStyles ?? ['plain', 'cards', 'timeline'],
      seed,
      12,
    ),
    skillsStyle: seededPick(
      preset.skillsStyles ?? ['chips', 'grid', 'list'],
      seed,
      13,
    ),
    educationStyle: seededPick(
      preset.educationStyles ?? ['plain', 'cards', 'timeline'],
      seed,
      14,
    ),
    summaryStyle: seededPick(
      preset.summaryStyles ?? ['plain', 'highlight', 'quote'],
      seed,
      15,
    ),
    decoration: seededPick(
      preset.decorations ?? ['none', 'top-band', 'side-band', 'geometric'],
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

function asRecord(value: unknown): TUnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as TUnknownRecord)
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

export function parseGeneratedResumeContent(content: string): TUnknownRecord {
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
  generated: TUnknownRecord,
): BuildResumeDTO {
  const generatedExperience = new Map<number, TUnknownRecord>();
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
