import { BuildResumeDTO } from '@app/contracts/dtos/resume';
import {
  buildFallbackResumeDesign,
  parseGeneratedResumeDesign,
} from './resume-ai-generation.util';

type UnknownRecord = Record<string, unknown>;

const designProperties = {
  layout: {
    type: 'string',
    enum: ['single', 'two-column', 'left-sidebar', 'right-sidebar'],
  },
  columnRatio: { type: 'string', enum: ['narrow', 'balanced', 'wide'] },
  headerLayout: {
    type: 'string',
    enum: ['stacked', 'split', 'centered', 'compact'],
  },
  avatarPlacement: { type: 'string', enum: ['start', 'center', 'end'] },
  sidebarSections: {
    type: 'array',
    items: {
      type: 'string',
      enum: ['summary', 'skills', 'education', 'careerScopes'],
    },
    minItems: 1,
    maxItems: 4,
  },
  palette: {
    type: 'string',
    enum: [
      'ocean',
      'cobalt',
      'violet',
      'emerald',
      'amber',
      'rose',
      'graphite',
      'midnight',
      'sand',
    ],
  },
  typography: {
    type: 'string',
    enum: ['sans', 'serif', 'geometric', 'humanist', 'mono'],
  },
  density: { type: 'string', enum: ['compact', 'balanced', 'spacious'] },
  headerStyle: { type: 'string', enum: ['solid', 'soft', 'minimal'] },
  sectionStyle: { type: 'string', enum: ['line', 'bar', 'pill', 'plain'] },
  cornerStyle: { type: 'string', enum: ['square', 'soft', 'rounded'] },
  experienceStyle: {
    type: 'string',
    enum: ['plain', 'cards', 'timeline'],
  },
  skillsStyle: { type: 'string', enum: ['chips', 'grid', 'list'] },
  educationStyle: {
    type: 'string',
    enum: ['plain', 'cards', 'timeline'],
  },
  summaryStyle: { type: 'string', enum: ['plain', 'highlight', 'quote'] },
  decoration: {
    type: 'string',
    enum: ['none', 'top-band', 'side-band', 'geometric'],
  },
};

export const RESUME_TEXT_IMPORT_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    personalInfo: {
      type: 'object',
      additionalProperties: false,
      properties: {
        fullName: { type: 'string', maxLength: 200 },
        email: { type: 'string', maxLength: 320 },
        phone: { type: 'string', maxLength: 80 },
        location: { type: 'string', maxLength: 250 },
        age: { type: ['integer', 'null'] },
        job: { type: 'string', maxLength: 250 },
        socials: {
          type: 'array',
          maxItems: 20,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              platform: { type: 'string', maxLength: 50 },
              url: { type: 'string', maxLength: 2_000 },
            },
            required: ['platform', 'url'],
          },
        },
      },
      required: [
        'fullName',
        'email',
        'phone',
        'location',
        'age',
        'job',
        'socials',
      ],
    },
    summary: { type: 'string', maxLength: 5_000 },
    yearsOfExperience: { type: 'string', maxLength: 100 },
    availability: { type: 'string', maxLength: 200 },
    experience: {
      type: 'array',
      maxItems: 30,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          company: { type: 'string', maxLength: 250 },
          position: { type: 'string', maxLength: 250 },
          startDate: { type: 'string', maxLength: 100 },
          endDate: { type: 'string', maxLength: 100 },
          description: { type: 'string', maxLength: 5_000 },
          achievements: {
            type: 'array',
            maxItems: 30,
            items: { type: 'string', maxLength: 1_000 },
          },
        },
        required: [
          'company',
          'position',
          'startDate',
          'endDate',
          'description',
          'achievements',
        ],
      },
    },
    skills: {
      type: 'array',
      maxItems: 100,
      items: { type: 'string', maxLength: 100 },
    },
    education: { type: 'string', maxLength: 5_000 },
    careerScopes: {
      type: 'array',
      maxItems: 50,
      items: { type: 'string', maxLength: 150 },
    },
    design: {
      type: 'object',
      additionalProperties: false,
      properties: designProperties,
      required: Object.keys(designProperties),
    },
  },
  required: [
    'personalInfo',
    'summary',
    'yearsOfExperience',
    'availability',
    'experience',
    'skills',
    'education',
    'careerScopes',
    'design',
  ],
};

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function optionalText(value: unknown, maxLength: number): string | undefined {
  return text(value, maxLength) || undefined;
}

function textArray(
  value: unknown,
  maxItems: number,
  maxLength: number,
): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    const candidate = text(item, maxLength);
    const key = candidate.toLocaleLowerCase();
    if (!candidate || seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
    if (result.length >= maxItems) break;
  }

  return result;
}

function safeEmail(value: unknown): string {
  const email = text(value, 320);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function safeAge(value: unknown): number | undefined {
  return Number.isInteger(value) && Number(value) >= 14 && Number(value) <= 100
    ? Number(value)
    : undefined;
}

function parseSocials(value: unknown): Record<string, string> | undefined {
  if (!Array.isArray(value)) return undefined;
  const socials: Record<string, string> = {};

  for (const item of value.slice(0, 20)) {
    const social = asRecord(item);
    if (!social) continue;
    const platform = text(social.platform, 50)
      .toLocaleLowerCase()
      .replace(/[^a-z0-9_-]/g, '');
    const url = text(social.url, 2_000);
    if (platform && /^https?:\/\/\S+$/i.test(url) && !socials[platform]) {
      socials[platform] = url;
    }
  }

  return Object.keys(socials).length > 0 ? socials : undefined;
}

export function parseResumeFromTextOutput(
  content: string,
  template: BuildResumeDTO['template'],
  variationSeed: number,
): BuildResumeDTO {
  const parsed: unknown = JSON.parse(content);
  const root = asRecord(parsed);
  if (!root) throw new Error('AI returned an invalid imported resume');

  const personalInfo = asRecord(root.personalInfo) ?? {};
  const experience = Array.isArray(root.experience)
    ? root.experience.slice(0, 30).flatMap((value) => {
        const item = asRecord(value);
        if (!item) return [];
        return [
          {
            company: text(item.company, 250),
            position: text(item.position, 250),
            startDate: text(item.startDate, 100),
            endDate: optionalText(item.endDate, 100),
            description: text(item.description, 5_000),
            achievements: textArray(item.achievements, 30, 1_000),
          },
        ];
      })
    : [];

  return {
    personalInfo: {
      fullName: text(personalInfo.fullName, 200),
      email: safeEmail(personalInfo.email),
      phone: optionalText(personalInfo.phone, 80),
      location: optionalText(personalInfo.location, 250),
      age: safeAge(personalInfo.age),
      job: optionalText(personalInfo.job, 250),
      socials: parseSocials(personalInfo.socials),
    },
    summary: optionalText(root.summary, 5_000),
    yearsOfExperience: optionalText(root.yearsOfExperience, 100),
    availability: optionalText(root.availability, 200),
    experience,
    skills: textArray(root.skills, 100, 100),
    education: optionalText(root.education, 5_000),
    careerScopes: textArray(root.careerScopes, 50, 150),
    sectionOrder: [
      'summary',
      'experience',
      'skills',
      'education',
      'careerScopes',
    ],
    design:
      parseGeneratedResumeDesign(root.design) ??
      buildFallbackResumeDesign(template, variationSeed),
    template,
  };
}
