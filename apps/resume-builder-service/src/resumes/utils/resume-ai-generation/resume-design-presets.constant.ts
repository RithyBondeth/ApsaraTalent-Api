import { BuildResumeDTO } from '@app/contracts/dtos/resume';

export type TUnknownRecord = Record<string, unknown>;
export type TResumeDesign = NonNullable<BuildResumeDTO['design']>;
export type TResumeTemplate = BuildResumeDTO['template'];

/**
 * Per-template design space. Every field the fallback generator samples can be
 * constrained per template so variation stays inside the template's identity;
 * omitted fields fall back to the full range of valid values.
 */
export interface IStylePreset {
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

export const STYLE_PRESETS: Record<TResumeTemplate, IStylePreset> = {
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
