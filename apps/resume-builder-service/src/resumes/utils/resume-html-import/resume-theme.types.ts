import { BuildResumeDTO } from '@app/contracts/dtos/resume';

/** Shared shape definitions for resume theming and layout resolution. */
export type TResumeSection = NonNullable<
  BuildResumeDTO['sectionOrder']
>[number];
export type TResumeTemplate = BuildResumeDTO['template'];

export interface ITemplateTheme {
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

export type TResumeDesign = NonNullable<BuildResumeDTO['design']>;

export interface IResolvedTemplateTheme extends ITemplateTheme {
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
