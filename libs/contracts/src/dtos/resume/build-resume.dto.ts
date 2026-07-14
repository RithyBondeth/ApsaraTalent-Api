import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  Max,
  Min,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsDefined,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  ValidateNested,
} from 'class-validator';

export class PersonalInfoDTO {
  @IsString()
  @MaxLength(200)
  fullName: string;

  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  phone?: string;

  @IsString()
  @MaxLength(250)
  @IsOptional()
  location?: string;

  @IsNumber()
  @IsInt()
  @Min(14)
  @Max(100)
  @IsOptional()
  age?: number;

  @IsString()
  @MaxLength(250)
  @IsOptional()
  job?: string;

  @IsString()
  @MaxLength(1_500_000)
  @IsOptional()
  profilePicture?: string;

  @IsObject()
  @IsOptional()
  socials?: { [platform: string]: string };
}

export class ExperienceDTO {
  @IsString()
  @MaxLength(250)
  company: string;

  @IsString()
  @MaxLength(250)
  position: string;

  @IsString()
  @MaxLength(100)
  startDate: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  endDate?: string;

  @IsString()
  @MaxLength(5_000)
  description: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(1_000, { each: true })
  achievements: string[];
}

export class ResumeDesignDTO {
  @IsString()
  @IsIn(['single', 'two-column', 'left-sidebar', 'right-sidebar'])
  layout: 'single' | 'two-column' | 'left-sidebar' | 'right-sidebar';

  @IsString()
  @IsIn(['narrow', 'balanced', 'wide'])
  columnRatio: 'narrow' | 'balanced' | 'wide';

  @IsString()
  @IsIn(['stacked', 'split', 'centered', 'compact'])
  headerLayout: 'stacked' | 'split' | 'centered' | 'compact';

  @IsString()
  @IsIn(['start', 'center', 'end'])
  avatarPlacement: 'start' | 'center' | 'end';

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsIn(['summary', 'skills', 'education', 'careerScopes'], { each: true })
  sidebarSections: Array<'summary' | 'skills' | 'education' | 'careerScopes'>;

  @IsString()
  @IsIn([
    'ocean',
    'cobalt',
    'violet',
    'emerald',
    'amber',
    'rose',
    'graphite',
    'midnight',
    'sand',
  ])
  palette:
    | 'ocean'
    | 'cobalt'
    | 'violet'
    | 'emerald'
    | 'amber'
    | 'rose'
    | 'graphite'
    | 'midnight'
    | 'sand';

  @IsString()
  @IsIn(['sans', 'serif', 'geometric', 'humanist', 'mono'])
  typography: 'sans' | 'serif' | 'geometric' | 'humanist' | 'mono';

  @IsString()
  @IsIn(['compact', 'balanced', 'spacious'])
  density: 'compact' | 'balanced' | 'spacious';

  @IsString()
  @IsIn(['solid', 'soft', 'minimal'])
  headerStyle: 'solid' | 'soft' | 'minimal';

  @IsString()
  @IsIn(['line', 'bar', 'pill', 'plain'])
  sectionStyle: 'line' | 'bar' | 'pill' | 'plain';

  @IsString()
  @IsIn(['square', 'soft', 'rounded'])
  cornerStyle: 'square' | 'soft' | 'rounded';

  @IsString()
  @IsIn(['plain', 'cards', 'timeline'])
  experienceStyle: 'plain' | 'cards' | 'timeline';

  @IsString()
  @IsIn(['chips', 'grid', 'list'])
  skillsStyle: 'chips' | 'grid' | 'list';

  @IsString()
  @IsIn(['plain', 'cards', 'timeline'])
  educationStyle: 'plain' | 'cards' | 'timeline';

  @IsString()
  @IsIn(['plain', 'highlight', 'quote'])
  summaryStyle: 'plain' | 'highlight' | 'quote';

  @IsString()
  @IsIn(['none', 'top-band', 'side-band', 'geometric'])
  decoration: 'none' | 'top-band' | 'side-band' | 'geometric';
}

export class BuildResumeDTO {
  @IsDefined()
  @ValidateNested()
  @Type(() => PersonalInfoDTO)
  personalInfo: PersonalInfoDTO;

  @IsString()
  @MaxLength(5_000)
  @IsOptional()
  summary?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  yearsOfExperience?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  availability?: string;

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ExperienceDTO)
  experience: ExperienceDTO[];

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  skills: string[];

  @IsString()
  @MaxLength(5_000)
  @IsOptional()
  education?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(150, { each: true })
  @IsOptional()
  careerScopes?: string[];

  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsIn(['summary', 'experience', 'skills', 'education', 'careerScopes'], {
    each: true,
  })
  @IsOptional()
  sectionOrder?: Array<
    'summary' | 'experience' | 'skills' | 'education' | 'careerScopes'
  >;

  @ValidateNested()
  @Type(() => ResumeDesignDTO)
  @IsOptional()
  design?: ResumeDesignDTO;

  @IsString()
  @IsIn([
    'modern',
    'classic',
    'creative',
    'minimalist',
    'timeline',
    'bold',
    'compact',
    'elegant',
    'colorful',
    'professional',
    'corporate',
    'dark',
  ])
  template:
    | 'modern'
    | 'classic'
    | 'creative'
    | 'minimalist'
    | 'timeline'
    | 'bold'
    | 'compact'
    | 'elegant'
    | 'colorful'
    | 'professional'
    | 'corporate'
    | 'dark';
}

export class BuildResumeResponseDTO {
  filename: string;
  mimeType: string;
  /** Base64-encoded PDF content */
  data: string;

  constructor(partial: Partial<BuildResumeResponseDTO>) {
    Object.assign(this, partial);
  }
}
