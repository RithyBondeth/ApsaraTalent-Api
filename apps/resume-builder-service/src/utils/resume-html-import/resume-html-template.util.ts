import { BuildResumeDTO } from '@app/contracts/dtos/resume';

type TResumeSection = NonNullable<BuildResumeDTO['sectionOrder']>[number];
type TResumeTemplate = BuildResumeDTO['template'];

interface ITemplateTheme {
  accent: string;
  accentSoft: string;
  background: string;
  headerBackground: string;
  headerText: string;
  text: string;
  muted: string;
  layout: TResumeDesign['layout'];
  radius: string;
  font: string;
}

type TResumeDesign = NonNullable<BuildResumeDTO['design']>;

interface IResolvedTemplateTheme extends ITemplateTheme {
  bodyFontSize: number;
  lineHeight: number;
  sidebarWidth: number;
  headerPadding: string;
  contentPadding: string;
  avatarSize: number;
  nameSize: number;
  sectionGap: number;
  experiencePadding: string;
  chipRadius: string;
  avatarRadius: string;
  sectionStyle: TResumeDesign['sectionStyle'];
  headerStyle: TResumeDesign['headerStyle'];
  columnRatio: TResumeDesign['columnRatio'];
  headerLayout: TResumeDesign['headerLayout'];
  avatarPlacement: TResumeDesign['avatarPlacement'];
  sidebarSections: TResumeDesign['sidebarSections'];
  experienceStyle: TResumeDesign['experienceStyle'];
  skillsStyle: TResumeDesign['skillsStyle'];
  educationStyle: TResumeDesign['educationStyle'];
  summaryStyle: TResumeDesign['summaryStyle'];
  decoration: TResumeDesign['decoration'];
}

const DEFAULT_SECTION_ORDER: TResumeSection[] = [
  'summary',
  'experience',
  'skills',
  'education',
  'careerScopes',
];

const THEMES: Record<TResumeTemplate, ITemplateTheme> = {
  modern: {
    accent: '#2563EB',
    accentSoft: '#DBEAFE',
    background: '#FFFFFF',
    headerBackground: '#172554',
    headerText: '#FFFFFF',
    text: '#172033',
    muted: '#64748B',
    layout: 'left-sidebar',
    radius: '8px',
    font: 'Arial, Helvetica, sans-serif',
  },
  classic: {
    accent: '#27272A',
    accentSoft: '#E4E4E7',
    background: '#FFFFFF',
    headerBackground: '#FFFFFF',
    headerText: '#18181B',
    text: '#27272A',
    muted: '#71717A',
    layout: 'single',
    radius: '0',
    font: "Georgia, 'Times New Roman', serif",
  },
  creative: {
    accent: '#7C3AED',
    accentSoft: '#EDE9FE',
    background: '#FFFFFF',
    headerBackground: '#5B21B6',
    headerText: '#FFFFFF',
    text: '#2E1065',
    muted: '#6B7280',
    layout: 'left-sidebar',
    radius: '12px',
    font: 'Arial, Helvetica, sans-serif',
  },
  minimalist: {
    accent: '#0284C7',
    accentSoft: '#E0F2FE',
    background: '#FFFFFF',
    headerBackground: '#FFFFFF',
    headerText: '#0F172A',
    text: '#1E293B',
    muted: '#64748B',
    layout: 'single',
    radius: '0',
    font: 'Arial, Helvetica, sans-serif',
  },
  timeline: {
    accent: '#4F46E5',
    accentSoft: '#E0E7FF',
    background: '#FFFFFF',
    headerBackground: '#4338CA',
    headerText: '#FFFFFF',
    text: '#1E1B4B',
    muted: '#6366F1',
    layout: 'single',
    radius: '10px',
    font: 'Arial, Helvetica, sans-serif',
  },
  bold: {
    accent: '#DC2626',
    accentSoft: '#FEE2E2',
    background: '#FFFFFF',
    headerBackground: '#18181B',
    headerText: '#FFFFFF',
    text: '#18181B',
    muted: '#71717A',
    layout: 'left-sidebar',
    radius: '2px',
    font: 'Arial Black, Arial, Helvetica, sans-serif',
  },
  compact: {
    accent: '#1D4ED8',
    accentSoft: '#DBEAFE',
    background: '#FFFFFF',
    headerBackground: '#1E40AF',
    headerText: '#FFFFFF',
    text: '#1E293B',
    muted: '#64748B',
    layout: 'two-column',
    radius: '4px',
    font: 'Arial, Helvetica, sans-serif',
  },
  elegant: {
    accent: '#A16207',
    accentSoft: '#FEF3C7',
    background: '#FFFBEB',
    headerBackground: '#FEF3C7',
    headerText: '#422006',
    text: '#422006',
    muted: '#78716C',
    layout: 'left-sidebar',
    radius: '10px',
    font: "Georgia, 'Times New Roman', serif",
  },
  colorful: {
    accent: '#0F766E',
    accentSoft: '#CCFBF1',
    background: '#FFFFFF',
    headerBackground: '#0F766E',
    headerText: '#FFFFFF',
    text: '#312E81',
    muted: '#6B7280',
    layout: 'left-sidebar',
    radius: '14px',
    font: 'Arial, Helvetica, sans-serif',
  },
  professional: {
    accent: '#0369A1',
    accentSoft: '#E0F2FE',
    background: '#FFFFFF',
    headerBackground: '#F1F5F9',
    headerText: '#0F172A',
    text: '#1E293B',
    muted: '#64748B',
    layout: 'left-sidebar',
    radius: '6px',
    font: 'Arial, Helvetica, sans-serif',
  },
  corporate: {
    accent: '#1D4ED8',
    accentSoft: '#DBEAFE',
    background: '#FFFFFF',
    headerBackground: '#1E3A5F',
    headerText: '#FFFFFF',
    text: '#1E293B',
    muted: '#64748B',
    layout: 'two-column',
    radius: '4px',
    font: 'Arial, Helvetica, sans-serif',
  },
  dark: {
    accent: '#58A6FF',
    accentSoft: '#1C2128',
    background: '#161B22',
    headerBackground: '#0D1117',
    headerText: '#E6EDF3',
    text: '#E6EDF3',
    muted: '#8B949E',
    layout: 'right-sidebar',
    radius: '6px',
    font: "'Courier New', Courier, monospace",
  },
  executive: {
    accent: '#B45309',
    accentSoft: '#FDE68A',
    background: '#FFFFFF',
    headerBackground: '#1C1917',
    headerText: '#F5F5F4',
    text: '#292524',
    muted: '#78716C',
    layout: 'right-sidebar',
    radius: '0',
    font: "Georgia, 'Times New Roman', serif",
  },
  tech: {
    accent: '#10B981',
    accentSoft: '#D1FAE5',
    background: '#FFFFFF',
    headerBackground: '#022C22',
    headerText: '#ECFDF5',
    text: '#1E293B',
    muted: '#64748B',
    layout: 'left-sidebar',
    radius: '4px',
    font: "'Courier New', Courier, monospace",
  },
  academic: {
    accent: '#155E75',
    accentSoft: '#CFFAFE',
    background: '#FFFFFF',
    headerBackground: '#FFFFFF',
    headerText: '#164E63',
    text: '#1E293B',
    muted: '#64748B',
    layout: 'single',
    radius: '0',
    font: "Georgia, 'Times New Roman', serif",
  },
  startup: {
    accent: '#EA580C',
    accentSoft: '#FFEDD5',
    background: '#FFFFFF',
    headerBackground: '#FFF7ED',
    headerText: '#7C2D12',
    text: '#431407',
    muted: '#78716C',
    layout: 'two-column',
    radius: '14px',
    font: "'Trebuchet MS', Verdana, sans-serif",
  },
  swiss: {
    accent: '#DC2626',
    accentSoft: '#FEE2E2',
    background: '#FFFFFF',
    headerBackground: '#FFFFFF',
    headerText: '#111827',
    text: '#111827',
    muted: '#6B7280',
    layout: 'single',
    radius: '0',
    font: 'Helvetica, Arial, sans-serif',
  },
  pastel: {
    accent: '#BE185D',
    accentSoft: '#FCE7F3',
    background: '#FFFFFF',
    headerBackground: '#FCE7F3',
    headerText: '#831843',
    text: '#4C1D3D',
    muted: '#71717A',
    layout: 'right-sidebar',
    radius: '14px',
    font: 'Verdana, Geneva, sans-serif',
  },
};

const DESIGN_PALETTES: Record<
  TResumeDesign['palette'],
  {
    accent: string;
    accentSoft: string;
    background: string;
    header: string;
    headerText: string;
    text: string;
    muted: string;
  }
> = {
  ocean: {
    accent: '#0E7490',
    accentSoft: '#CFFAFE',
    background: '#F8FEFF',
    header: '#164E63',
    headerText: '#FFFFFF',
    text: '#153243',
    muted: '#527080',
  },
  cobalt: {
    accent: '#2563EB',
    accentSoft: '#DBEAFE',
    background: '#FFFFFF',
    header: '#1E3A8A',
    headerText: '#FFFFFF',
    text: '#172554',
    muted: '#64748B',
  },
  violet: {
    accent: '#7C3AED',
    accentSoft: '#EDE9FE',
    background: '#FEFCFF',
    header: '#4C1D95',
    headerText: '#FFFFFF',
    text: '#2E1065',
    muted: '#6B6480',
  },
  emerald: {
    accent: '#047857',
    accentSoft: '#D1FAE5',
    background: '#FBFFFD',
    header: '#064E3B',
    headerText: '#FFFFFF',
    text: '#143D32',
    muted: '#5D746D',
  },
  amber: {
    accent: '#B45309',
    accentSoft: '#FEF3C7',
    background: '#FFFCF5',
    header: '#78350F',
    headerText: '#FFFFFF',
    text: '#451A03',
    muted: '#78716C',
  },
  rose: {
    accent: '#BE123C',
    accentSoft: '#FFE4E6',
    background: '#FFFDFD',
    header: '#881337',
    headerText: '#FFFFFF',
    text: '#4C0519',
    muted: '#7B6870',
  },
  graphite: {
    accent: '#475569',
    accentSoft: '#E2E8F0',
    background: '#FFFFFF',
    header: '#1E293B',
    headerText: '#FFFFFF',
    text: '#1E293B',
    muted: '#64748B',
  },
  midnight: {
    accent: '#60A5FA',
    accentSoft: '#1E293B',
    background: '#0F172A',
    header: '#020617',
    headerText: '#F8FAFC',
    text: '#E2E8F0',
    muted: '#94A3B8',
  },
  sand: {
    accent: '#A16207',
    accentSoft: '#FEF3C7',
    background: '#FFFBEB',
    header: '#713F12',
    headerText: '#FFFFFF',
    text: '#422006',
    muted: '#78716C',
  },
};

const DESIGN_FONTS: Record<TResumeDesign['typography'], string> = {
  sans: 'Arial, Helvetica, sans-serif',
  serif: "Georgia, 'Times New Roman', serif",
  geometric: "'Trebuchet MS', Arial, sans-serif",
  humanist: "'Segoe UI', Arial, sans-serif",
  mono: "'Courier New', Courier, monospace",
};

const DESIGN_DENSITY: Record<
  TResumeDesign['density'],
  Pick<
    IResolvedTemplateTheme,
    | 'bodyFontSize'
    | 'lineHeight'
    | 'sidebarWidth'
    | 'headerPadding'
    | 'contentPadding'
    | 'avatarSize'
    | 'nameSize'
    | 'sectionGap'
    | 'experiencePadding'
  >
> = {
  compact: {
    bodyFontSize: 11.5,
    lineHeight: 1.35,
    sidebarWidth: 200,
    headerPadding: '24px 22px',
    contentPadding: '22px 26px',
    avatarSize: 72,
    nameSize: 22,
    sectionGap: 16,
    experiencePadding: '7px 9px',
  },
  balanced: {
    bodyFontSize: 13,
    lineHeight: 1.5,
    sidebarWidth: 225,
    headerPadding: '34px 28px',
    contentPadding: '30px 34px',
    avatarSize: 88,
    nameSize: 25,
    sectionGap: 24,
    experiencePadding: '10px 12px',
  },
  spacious: {
    bodyFontSize: 13.5,
    lineHeight: 1.65,
    sidebarWidth: 245,
    headerPadding: '40px 34px',
    contentPadding: '36px 42px',
    avatarSize: 96,
    nameSize: 28,
    sectionGap: 29,
    experiencePadding: '13px 15px',
  },
};

const CUSTOM_ACCENT_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function hexChannels(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function mixHex(
  hex: string,
  target: [number, number, number],
  weight: number,
): string {
  const source = hexChannels(hex);
  return `#${source
    .map((channel, index) =>
      Math.max(
        0,
        Math.min(
          255,
          Math.round(channel * (1 - weight) + target[index] * weight),
        ),
      )
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase();
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexChannels(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

function deriveCustomAccentColors(customAccent: string): {
  accent: string;
  accentSoft: string;
  header: string;
  headerText: string;
} {
  const header = mixHex(customAccent, [0, 0, 0], 0.35);
  return {
    accent: customAccent.toUpperCase(),
    accentSoft: mixHex(customAccent, [255, 255, 255], 0.85),
    header,
    headerText:
      contrastRatio(header, '#FFFFFF') >= contrastRatio(header, '#1E293B')
        ? '#FFFFFF'
        : '#1E293B',
  };
}

function resolveTheme(dto: BuildResumeDTO): IResolvedTemplateTheme {
  const base = THEMES[dto.template] ?? THEMES.modern;
  const defaults: IResolvedTemplateTheme = {
    ...base,
    bodyFontSize: 13,
    lineHeight: 1.5,
    sidebarWidth: 225,
    headerPadding: '34px 28px',
    contentPadding: '30px 34px',
    avatarSize: 88,
    nameSize: 25,
    sectionGap: 24,
    experiencePadding: '10px 12px',
    chipRadius: '999px',
    avatarRadius: '50%',
    sectionStyle: 'line',
    headerStyle: 'solid',
    columnRatio: 'balanced',
    headerLayout: base.layout === 'single' ? 'centered' : 'split',
    avatarPlacement: base.layout === 'single' ? 'center' : 'start',
    sidebarSections: ['skills', 'education', 'careerScopes'],
    experienceStyle: 'plain',
    skillsStyle: 'chips',
    educationStyle: 'plain',
    summaryStyle: 'plain',
    decoration: 'none',
  };
  if (!dto.design) return defaults;

  const palette = DESIGN_PALETTES[dto.design.palette];
  const density = DESIGN_DENSITY[dto.design.density];
  // User-picked accent overrides the palette's accent family; text, muted and
  // page background stay on the named palette for readability.
  const custom =
    dto.design.customAccent &&
    CUSTOM_ACCENT_PATTERN.test(dto.design.customAccent)
      ? deriveCustomAccentColors(dto.design.customAccent)
      : null;
  const accent = custom?.accent ?? palette.accent;
  const accentSoft = custom?.accentSoft ?? palette.accentSoft;
  const solidHeader = custom?.header ?? palette.header;
  const solidHeaderText = custom?.headerText ?? palette.headerText;
  const radius =
    dto.design.cornerStyle === 'square'
      ? '0'
      : dto.design.cornerStyle === 'soft'
        ? '7px'
        : '15px';
  const headerBackground =
    dto.design.headerStyle === 'solid'
      ? solidHeader
      : dto.design.headerStyle === 'soft'
        ? accentSoft
        : palette.background;
  const headerText =
    dto.design.headerStyle === 'solid' ? solidHeaderText : palette.text;

  return {
    accent,
    accentSoft,
    background: palette.background,
    headerBackground,
    headerText,
    text: palette.text,
    muted: palette.muted,
    layout: dto.design.layout,
    radius,
    font: DESIGN_FONTS[dto.design.typography],
    ...density,
    chipRadius: dto.design.cornerStyle === 'rounded' ? '999px' : radius,
    avatarRadius:
      dto.design.cornerStyle === 'rounded'
        ? '50%'
        : dto.design.cornerStyle === 'soft'
          ? '14px'
          : '0',
    sectionStyle: dto.design.sectionStyle,
    headerStyle: dto.design.headerStyle,
    columnRatio: dto.design.columnRatio,
    headerLayout: dto.design.headerLayout,
    avatarPlacement: dto.design.avatarPlacement,
    sidebarSections: [...dto.design.sidebarSections],
    experienceStyle: dto.design.experienceStyle,
    skillsStyle: dto.design.skillsStyle,
    educationStyle: dto.design.educationStyle,
    summaryStyle: dto.design.summaryStyle,
    decoration: dto.design.decoration,
  };
}

function headingCss(theme: IResolvedTemplateTheme): string {
  const base = `margin: ${Math.max(12, theme.sectionGap - 6)}px 0 8px; padding-bottom: 3px; font-size: 10px; text-transform: uppercase; letter-spacing: .1em;`;
  if (theme.sectionStyle === 'bar') {
    return `${base} padding: 6px 9px; color: ${theme.background}; background: ${theme.accent}; border-radius: ${theme.radius};`;
  }
  if (theme.sectionStyle === 'pill') {
    return `${base} display: inline-block; padding: 5px 11px; color: ${theme.accent}; background: ${theme.accentSoft}; border-radius: ${theme.chipRadius};`;
  }
  if (theme.sectionStyle === 'plain') {
    return `${base} color: ${theme.accent};`;
  }
  return `${base} color: ${theme.accent}; border-bottom: 1.5px solid ${theme.accentSoft};`;
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SOCIAL_PLATFORM_LABELS: Record<string, string> = {
  behance: 'Behance',
  dribbble: 'Dribbble',
  facebook: 'Facebook',
  github: 'GitHub',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  portfolio: 'Portfolio',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  twitter: 'X',
  website: 'Website',
  x: 'X',
  youtube: 'YouTube',
};

function formatSocialPlatformLabel(platform: string): string {
  const cleanedPlatform = platform
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s*(?:url|link)\s*$/i, '')
    .trim();
  const normalizedPlatform = cleanedPlatform.replace(/\s+/g, '').toLowerCase();

  if (SOCIAL_PLATFORM_LABELS[normalizedPlatform]) {
    return SOCIAL_PLATFORM_LABELS[normalizedPlatform];
  }

  return (
    cleanedPlatform
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') || 'Website'
  );
}

function normalizeSocialLinkUrl(value: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  let candidate = trimmedValue;
  if (candidate.startsWith('//')) {
    candidate = `https:${candidate}`;
  } else if (!/^https?:\/\//i.test(candidate)) {
    if (/^[a-z][a-z\d+.-]*:/i.test(candidate)) return null;
    candidate = `https://${candidate}`;
  }

  try {
    const parsedUrl = new URL(candidate);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
      ? candidate
      : null;
  } catch {
    return null;
  }
}

function formatYearsExperience(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return '';
  if (/\b(?:experience|exp\.?)\s*$/i.test(trimmedValue)) return trimmedValue;
  if (/\b(?:years?|yrs?\.?)\s*$/i.test(trimmedValue)) {
    return `${trimmedValue} exp.`;
  }
  return `${trimmedValue} yrs exp.`;
}

function dataImage(value?: string): string | null {
  if (!value) return null;
  return /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(value)
    ? value
    : null;
}

function monogram(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return esc(initials || 'CV');
}

function renderSection(section: TResumeSection, dto: BuildResumeDTO): string {
  if (section === 'summary') {
    return dto.summary
      ? `<section class="summary summary-${dto.design?.summaryStyle ?? 'plain'}"><h2>Professional Summary</h2><p>${esc(dto.summary)}</p></section>`
      : '';
  }

  if (section === 'experience') {
    if (!dto.experience?.length) return '';
    const entries = dto.experience
      .map((experience) => {
        const dates = [experience.startDate, experience.endDate]
          .filter(Boolean)
          .map(esc)
          .join(' - ');
        const achievements = experience.achievements
          ?.filter(Boolean)
          .map((item) => `<li>${esc(item)}</li>`)
          .join('');
        return `<article class="experience experience-${dto.design?.experienceStyle ?? 'plain'}">
          <div class="experience-head"><div><h3>${esc(experience.position)}</h3>${experience.company ? `<div class="company">${esc(experience.company)}</div>` : ''}</div><div class="dates">${dates}</div></div>
          ${experience.description ? `<p>${esc(experience.description)}</p>` : ''}
          ${achievements ? `<ul>${achievements}</ul>` : ''}
        </article>`;
      })
      .join('');
    return `<section><h2>Work Experience</h2>${entries}</section>`;
  }

  if (section === 'skills') {
    const values = dto.skills?.filter(Boolean) ?? [];
    const style = dto.design?.skillsStyle ?? 'chips';
    const skills =
      style === 'list'
        ? values.map((skill) => `<li>${esc(skill)}</li>`).join('')
        : values
            .map(
              (skill) =>
                `<span class="${style === 'grid' ? 'skill-item' : 'chip'}">${esc(skill)}</span>`,
            )
            .join('');
    return skills
      ? `<section><h2>Skills</h2>${style === 'list' ? `<ul class="skill-list">${skills}</ul>` : `<div class="skills skills-${style}">${skills}</div>`}</section>`
      : '';
  }

  if (section === 'education') {
    const entries = dto.education
      ?.split('|')
      .map((item) => item.trim())
      .filter(Boolean)
      .map(
        (item) =>
          `<div class="education education-${dto.design?.educationStyle ?? 'plain'}">${esc(item)}</div>`,
      )
      .join('');
    return entries ? `<section><h2>Education</h2>${entries}</section>` : '';
  }

  const scopes = dto.careerScopes
    ?.filter(Boolean)
    .map((scope) => `<span class="chip">${esc(scope)}</span>`)
    .join('');
  return scopes
    ? `<section><h2>Career Interests</h2><div>${scopes}</div></section>`
    : '';
}

/** Build print-ready HTML without executing or trusting model-authored markup. */
export function buildResumeHtml(dto: BuildResumeDTO): string {
  const theme = resolveTheme(dto);
  const picture = dataImage(dto.personalInfo.profilePicture);
  const sectionOrder = dto.sectionOrder?.length
    ? dto.sectionOrder
    : DEFAULT_SECTION_ORDER;
  const sidebarSections = new Set<TResumeSection>(theme.sidebarSections);
  const renderedSections = sectionOrder.map((section) => ({
    section,
    html: renderSection(section, dto),
  }));
  const secondarySections =
    theme.layout === 'single'
      ? []
      : renderedSections.filter(
          ({ section, html }) => html && sidebarSections.has(section),
        );
  const secondaryIds = new Set(secondarySections.map(({ section }) => section));
  const primarySections = renderedSections.filter(
    ({ section, html }) => html && !secondaryIds.has(section),
  );
  const layout = secondarySections.length > 0 ? theme.layout : 'single';
  const primaryHtml = primarySections.map(({ html }) => html).join('');
  const secondaryHtml = secondarySections.map(({ html }) => html).join('');
  const sidebarWidth = Math.round(
    theme.sidebarWidth *
      (theme.columnRatio === 'narrow'
        ? 0.84
        : theme.columnRatio === 'wide'
          ? 1.18
          : 1),
  );
  const columnGrid =
    theme.columnRatio === 'narrow'
      ? '1.65fr .75fr'
      : theme.columnRatio === 'wide'
        ? '1.1fr 1fr'
        : '1.35fr 1fr';
  const bodyGap = Math.max(18, theme.sectionGap);
  const socials = dto.personalInfo.socials
    ? Object.entries(dto.personalInfo.socials)
        .map(([platform, value]) => {
          const href = normalizeSocialLinkUrl(value);
          if (!href) return '';
          return `<a class="social-link" href="${esc(href)}"><span>${esc(formatSocialPlatformLabel(platform))}</span><span class="social-arrow" aria-hidden="true">&#8599;</span></a>`;
        })
        .filter(Boolean)
        .join('')
    : '';
  const contactItems = [
    ['&#9993;', dto.personalInfo.email],
    ['&#9742;', dto.personalInfo.phone],
    ['&#128205;', dto.personalInfo.location],
    ['&#127874;', dto.personalInfo.age ? `Age: ${dto.personalInfo.age}` : ''],
  ]
    .filter(([, value]) => Boolean(value))
    .map(
      ([icon, value]) =>
        `<span class="contact"><span class="contact-icon" aria-hidden="true">${icon}</span><span>${esc(value)}</span></span>`,
    )
    .join('');
  const metaItems = [
    dto.yearsOfExperience ? formatYearsExperience(dto.yearsOfExperience) : '',
    dto.availability ? `Available: ${dto.availability}` : '',
  ].filter(Boolean);

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: ${theme.background}; }
      body { font-family: ${theme.font}; color: ${theme.text}; font-size: ${theme.bodyFontSize}px; line-height: ${theme.lineHeight}; }
      .resume { min-height: 1123px; background: ${theme.background}; display: flex; flex-direction: column; }
      .decoration-top-band { border-top: 12px solid ${theme.accent}; }
      .decoration-side-band { border-left: 12px solid ${theme.accent}; }
      .decoration-geometric .header { background-image: linear-gradient(135deg, transparent 68%, ${theme.accent} 68%, ${theme.accent} 78%, transparent 78%); }
      .header { background: ${theme.headerBackground}; color: ${theme.headerText}; padding: ${theme.headerPadding}; text-align: left; ${theme.layout === 'single' ? `border-bottom: 3px solid ${theme.accent};` : theme.headerStyle === 'minimal' ? `border-bottom: 2px solid ${theme.accent};` : ''} }
      .identity-row { display: flex; align-items: center; gap: 18px; margin-bottom: 6px; }
      .header-stacked .identity-row, .header-centered .identity-row, .avatar-center .identity-row { flex-direction: column; align-items: flex-start; }
      .header-centered, .avatar-center { text-align: center; }
      .header-centered .identity-row, .avatar-center .identity-row { align-items: center; }
      .header.avatar-end { text-align: right; }
      .header-stacked.avatar-end .identity-row { align-items: flex-end; }
      .header-split.avatar-end .identity-row, .header-compact.avatar-end .identity-row { flex-direction: row-reverse; }
      .header-compact { padding-top: 20px; padding-bottom: 20px; }
      .header-compact .identity-row { gap: 12px; }
      .header-compact .avatar, .header-compact .monogram { width: ${Math.round(theme.avatarSize * 0.72)}px; height: ${Math.round(theme.avatarSize * 0.72)}px; }
      .identity { min-width: 0; flex: 1; }
      .resume-body { padding: ${theme.contentPadding}; min-width: 0; flex: 1 1 auto; display: grid; gap: ${bodyGap}px; align-items: start; }
      .layout-single .resume-body { display: block; }
      .layout-two-column .resume-body { grid-template-columns: ${columnGrid}; }
      .layout-left-sidebar .resume-body { grid-template-columns: ${sidebarWidth}px minmax(0, 1fr); }
      .layout-left-sidebar .secondary { grid-column: 1; grid-row: 1; }
      .layout-left-sidebar .primary { grid-column: 2; grid-row: 1; }
      .layout-right-sidebar .resume-body { grid-template-columns: minmax(0, 1fr) ${sidebarWidth}px; }
      .secondary { min-width: 0; }
      .primary { min-width: 0; }
      .avatar, .monogram { width: ${theme.avatarSize}px; height: ${theme.avatarSize}px; border-radius: ${theme.avatarRadius}; margin: 0; border: 3px solid ${theme.accent}; }
      .avatar { display: block; object-fit: cover; }
      .monogram { display: flex; align-items: center; justify-content: center; background: ${theme.accent}; color: #fff; font-size: 28px; font-weight: 700; }
      .name { font-size: ${theme.nameSize}px; font-weight: 700; line-height: 1.15; letter-spacing: -.3px; overflow-wrap: anywhere; }
      .job { margin-top: 2px; color: ${theme.layout === 'single' ? theme.accent : theme.headerText}; font-size: 13px; font-weight: 500; }
      .contacts { margin-top: 6px; display: flex; flex-wrap: wrap; justify-content: flex-start; font-size: 11px; overflow-wrap: anywhere; }
      .contact { display: inline-flex; align-items: baseline; margin-right: 14px; }
      .contact-icon { margin-right: 4px; }
      .meta { margin-top: 4px; font-size: 11px; }
      .socials { margin-top: 6px; display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 4px 12px; }
      .social-link { display: inline-flex; align-items: center; gap: 3px; color: ${theme.headerText}; font-size: 11px; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
      .social-arrow { font-size: 9px; }
      .header-centered .contacts, .header-centered .socials, .avatar-center .contacts, .avatar-center .socials { justify-content: center; }
      .header.avatar-end .contacts, .header.avatar-end .socials { justify-content: flex-end; }
      .header { break-inside: avoid; }
      /* A section may span pages when it is long, but its heading never sits
         alone at the foot of a page, and individual entries never split. */
      section { margin: 0; }
      h2 { ${headingCss(theme)} break-after: avoid; }
      h3 { margin: 0; color: ${theme.text}; font-size: 13px; font-weight: 600; break-after: avoid; }
      p { white-space: pre-line; overflow-wrap: anywhere; orphans: 2; widows: 2; }
      .summary p { margin: 0; color: ${theme.text}; font-size: 12px; line-height: ${theme.lineHeight}; }
      li { orphans: 2; widows: 2; }
      .summary-highlight { padding: ${theme.experiencePadding}; border-radius: ${theme.radius}; background: ${theme.accentSoft}; break-inside: avoid; }
      .summary-quote { padding-left: 16px; border-left: 4px solid ${theme.accent}; font-style: italic; }
      .experience { margin-bottom: ${Math.max(10, theme.sectionGap - 8)}px; break-inside: avoid; }
      .experience-cards { padding: ${theme.experiencePadding}; border: 1px solid ${theme.accent}; border-radius: ${theme.radius}; background: ${theme.accentSoft}; }
      .experience-timeline { padding: 3px 0 3px 14px; border-left: 3px solid ${theme.accent}; }
      .experience-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
      .company { margin-top: 1px; color: ${theme.muted}; font-size: 12px; }
      .dates { margin-left: 8px; flex-shrink: 0; color: ${theme.muted}; font-size: 11px; white-space: nowrap; }
      .experience p { margin: 4px 0 0; color: ${theme.text}; font-size: 12px; line-height: 1.55; }
      ul { margin: 4px 0 0 16px; padding: 0; }
      li { margin: 0 0 2px; font-size: 12px; }
      .chip { display: inline-block; margin: 2px 3px; padding: 2px 8px; border: 1px solid ${theme.accent}; border-radius: ${theme.chipRadius}; background: ${theme.skillsStyle === 'chips' ? theme.accentSoft : 'transparent'}; color: ${theme.accent}; font-size: 11px; }
      .skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 12px; }
      .skill-item { padding: 4px 0; border-bottom: 1px solid ${theme.accent}; color: ${theme.text}; font-size: 11px; }
      .skill-list { display: block; }
      .skill-list li { margin: 1px 0; }
      .education { margin: 0 0 6px; color: ${theme.text}; font-size: 12px; break-inside: avoid; }
      .education-cards { padding: 7px 9px; border: 1px solid ${theme.accent}; border-radius: ${theme.radius}; background: ${theme.accentSoft}; break-inside: avoid; }
      .education-timeline { padding-left: 10px; border-left: 3px solid ${theme.accent}; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  </head>
  <body>
    <div class="resume layout-${layout} decoration-${theme.decoration}" data-design-palette="${esc(dto.design?.palette ?? 'template')}" data-design-density="${esc(dto.design?.density ?? 'balanced')}" data-design-sections="${esc(theme.sectionStyle)}" data-design-layout="${esc(layout)}">
      <header class="header header-${theme.headerLayout} avatar-${theme.avatarPlacement}">
        <div class="identity-row">
          <div class="avatar-wrap">${picture ? `<img class="avatar" src="${picture}" alt="Profile">` : `<div class="monogram">${monogram(dto.personalInfo.fullName)}</div>`}</div>
          <div class="identity">
            <div class="name">${esc(dto.personalInfo.fullName)}</div>
            ${dto.personalInfo.job ? `<div class="job">${esc(dto.personalInfo.job)}</div>` : ''}
          </div>
        </div>
        ${contactItems ? `<div class="contacts">${contactItems}</div>` : ''}
        ${metaItems.length ? `<div class="meta">${esc(metaItems.join(' · '))}</div>` : ''}
        ${socials ? `<div class="socials">${socials}</div>` : ''}
      </header>
      <div class="resume-body">
        <main class="primary">${primaryHtml}</main>
        ${secondaryHtml ? `<aside class="secondary">${secondaryHtml}</aside>` : ''}
      </div>
    </div>
  </body>
  </html>`;
}
