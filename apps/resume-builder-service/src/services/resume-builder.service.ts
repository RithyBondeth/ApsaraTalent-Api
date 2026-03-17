import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import OpenAI from 'openai';
import * as puppeteer from 'puppeteer';
import { BuildResumeDTO } from '../dtos/resume-builder.dto';
import { ImageService } from './image.service';

@Injectable()
export class ResumeBuilderService {
  private openAI: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageService: ImageService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ResumeBuilderService.name);
    this.openAI = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
  }

  async buildResume(buildResumeDTO: BuildResumeDTO): Promise<any> {
    try {
      if (buildResumeDTO.personalInfo.profilePicture) {
        buildResumeDTO.personalInfo.profilePicture =
          await this.imageService.optimizeProfilePicture(
            buildResumeDTO.personalInfo.profilePicture,
          );
      }

      const htmlContent = await this.generateHTMLContent(buildResumeDTO);
      const pdfBuffer = await this.pdfGenerator(htmlContent);

      return {
        filename: 'resume.pdf',
        mimeType: 'application/pdf',
        data: pdfBuffer.toString('base64'),
      };
    } catch (error) {
      this.logger.error({ err: error }, 'Resume generation failed');
      throw new RpcException(
        error instanceof Error ? error.message : 'Resume generation failed',
      );
    }
  }

  private buildSystemPrompt(template: string): string {
    // ─── Per-template CSS scaffold ────────────────────────────────────────────
    const cssScaffolds: Record<string, string> = {
      modern: `
:root {
  --primary: #2563EB; --sidebar-bg: #1E3A5F; --sidebar-text: #ffffff;
  --body-bg: #ffffff; --text: #1F2937; --muted: #6B7280; --accent: #DBEAFE;
  --font: 'Inter', sans-serif;
}
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font); font-size: 14px; color: var(--text); background: var(--body-bg); width: 794px; min-height: 1123px; }
.wrapper { display: flex; min-height: 1123px; }
.sidebar { width: 30%; background: var(--sidebar-bg); color: var(--sidebar-text); padding: 32px 20px; display: flex; flex-direction: column; gap: 24px; }
.main { width: 70%; padding: 32px 28px; display: flex; flex-direction: column; gap: 20px; }
.avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary); display: block; margin: 0 auto; }
.monogram { width: 100px; height: 100px; border-radius: 50%; background: var(--primary); color: #fff; font-size: 2.2rem; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
.name { font-size: 1.4rem; font-weight: 700; text-align: center; margin-top: 12px; }
.job-title { font-size: 0.85rem; text-align: center; color: #93C5FD; margin-top: 4px; }
.contact-item { font-size: 0.78rem; display: flex; align-items: center; gap: 6px; color: #CBD5E1; margin-bottom: 4px; }
.section-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #93C5FD; border-bottom: 1px solid #334F6E; padding-bottom: 4px; margin-bottom: 10px; }
.skill-pill { display: inline-block; background: rgba(37,99,235,0.25); color: #BFDBFE; border: 1px solid #3B82F6; border-radius: 20px; padding: 2px 10px; font-size: 0.72rem; margin: 2px 2px; }
.main-section-title { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--primary); border-bottom: 2px solid var(--accent); padding-bottom: 4px; margin-bottom: 14px; }
.exp-position { font-size: 1rem; font-weight: 600; color: var(--text); }
.exp-company { font-size: 0.85rem; color: var(--muted); }
.exp-dates { font-size: 0.75rem; color: var(--muted); background: #F1F5F9; padding: 2px 8px; border-radius: 4px; float: right; margin-top: -20px; }
.exp-desc { font-size: 0.82rem; color: #374151; margin-top: 6px; line-height: 1.5; }
.exp-achievements li { font-size: 0.8rem; color: #374151; margin: 3px 0 3px 16px; line-height: 1.4; }
.summary-box { border-left: 3px solid var(--primary); padding: 10px 14px; background: #EFF6FF; border-radius: 0 6px 6px 0; font-size: 0.83rem; line-height: 1.6; color: #1E40AF; }
.social-link { font-size: 0.76rem; color: #93C5FD; display: flex; gap: 6px; margin-bottom: 4px; text-decoration: none; }
.career-chip { display: inline-block; background: rgba(37,99,235,0.2); color: #BFDBFE; border-radius: 12px; padding: 2px 10px; font-size: 0.72rem; margin: 2px; }`,

      classic: `
@import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:wght@400;600&display=swap');
:root { --text: #111827; --muted: #4B5563; --accent: #374151; --font-h: 'Merriweather', serif; --font-b: 'Source Serif 4', serif; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-b); font-size: 14px; color: var(--text); background: #fff; width: 794px; min-height: 1123px; padding: 48px 56px; }
.header { text-align: center; margin-bottom: 24px; }
.name { font-family: var(--font-h); font-size: 2.2rem; font-weight: 700; letter-spacing: 0.02em; }
.job-title { font-family: var(--font-h); font-size: 1rem; font-style: italic; color: var(--muted); margin-top: 4px; }
.contact-row { display: flex; justify-content: center; gap: 16px; margin-top: 10px; font-size: 0.8rem; color: var(--muted); }
.divider { border: none; border-top: 1.5px solid var(--accent); margin: 18px 0; }
.section-title { font-family: var(--font-h); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; border-bottom: 2px double var(--accent); padding-bottom: 4px; margin-bottom: 14px; }
.exp-header { display: flex; justify-content: space-between; align-items: baseline; }
.exp-position { font-family: var(--font-h); font-size: 0.95rem; font-weight: 700; }
.exp-company { font-size: 0.85rem; font-style: italic; color: var(--muted); }
.exp-dates { font-size: 0.8rem; font-style: italic; color: var(--muted); }
.exp-desc { font-size: 0.82rem; margin-top: 6px; line-height: 1.6; }
.exp-achievements li { font-size: 0.8rem; margin: 3px 0 3px 18px; line-height: 1.5; list-style-type: disc; }
.section { margin-bottom: 22px; }`,

      creative: `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Nunito:wght@400;500;600&display=swap');
:root { --purple: #7C3AED; --amber: #F59E0B; --text: #111827; --muted: #6B7280; --white: #ffffff; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Nunito', sans-serif; font-size: 14px; color: var(--text); background: #fff; width: 794px; min-height: 1123px; }
.wrapper { display: flex; min-height: 1123px; }
.sidebar { width: 35%; background: var(--purple); color: var(--white); padding: 36px 22px; display: flex; flex-direction: column; gap: 22px; }
.main { width: 65%; padding: 32px 26px; display: flex; flex-direction: column; gap: 22px; }
.avatar { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 4px solid var(--amber); display: block; margin: 0 auto; }
.monogram { width: 110px; height: 110px; border-radius: 50%; background: var(--amber); color: var(--purple); font-family: 'Poppins', sans-serif; font-size: 2.5rem; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
.name { font-family: 'Poppins', sans-serif; font-size: 1.3rem; font-weight: 700; text-align: center; margin-top: 12px; }
.job-title { font-size: 0.82rem; text-align: center; color: #DDD6FE; margin-top: 4px; }
.s-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--amber); margin-bottom: 8px; }
.contact-item { font-size: 0.78rem; display: flex; gap: 8px; color: #EDE9FE; margin-bottom: 5px; }
.skill-bubble { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: #EDE9FE; border-radius: 16px; padding: 3px 10px; font-size: 0.72rem; margin: 2px; }
.avail-badge { display: inline-block; background: #10B981; color: #fff; border-radius: 12px; padding: 3px 10px; font-size: 0.72rem; font-weight: 600; }
.social-row { font-size: 0.76rem; color: #DDD6FE; display: flex; gap: 6px; margin-bottom: 5px; }
.main-section-title { font-family: 'Poppins', sans-serif; font-size: 0.88rem; font-weight: 700; color: var(--purple); border-left: 4px solid var(--amber); padding-left: 10px; margin-bottom: 14px; }
.exp-card { background: #FAFAFA; border: 1px solid #F0EEFF; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(124,58,237,0.06); }
.exp-position { font-family: 'Poppins', sans-serif; font-size: 0.95rem; font-weight: 600; color: var(--purple); }
.exp-company { font-size: 0.82rem; color: var(--muted); }
.exp-dates { font-size: 0.74rem; color: var(--amber); font-weight: 600; margin-top: 2px; }
.exp-desc { font-size: 0.8rem; margin-top: 6px; line-height: 1.5; color: #374151; }
.exp-achievements li { font-size: 0.78rem; color: #4B5563; margin: 3px 0 3px 16px; line-height: 1.4; }
.summary-quote { border-left: 3px solid var(--amber); padding: 10px 14px; font-style: italic; font-size: 0.84rem; color: var(--purple); background: #FAF5FF; border-radius: 0 6px 6px 0; }
.career-chip { display: inline-block; background: #FEF3C7; color: #92400E; border-radius: 12px; padding: 2px 10px; font-size: 0.72rem; margin: 2px; border: 1px solid #FDE68A; }`,

      minimalist: `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');
:root { --sky: #0EA5E9; --text: #0F172A; --muted: #64748B; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; font-size: 13.5px; color: var(--text); background: #fff; width: 794px; min-height: 1123px; padding: 56px 64px; }
.name { font-size: 2.6rem; font-weight: 300; letter-spacing: -0.02em; color: var(--text); }
.job-title { font-size: 0.95rem; color: var(--sky); font-weight: 500; margin-top: 4px; }
.header-line { height: 1px; background: #E2E8F0; margin: 18px 0; }
.contact-row { display: flex; gap: 20px; font-size: 0.78rem; color: var(--muted); }
.section { margin-bottom: 28px; }
.section-label { font-size: 0.65rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.18em; color: var(--sky); border-bottom: 1.5px solid var(--sky); display: inline-block; padding-bottom: 2px; margin-bottom: 14px; }
.exp-position { font-size: 0.95rem; font-weight: 500; }
.exp-company { font-size: 0.82rem; color: var(--muted); }
.exp-date-badge { display: inline-block; font-size: 0.72rem; color: var(--muted); background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 1px 7px; float: right; margin-top: -18px; }
.exp-desc { font-size: 0.81rem; color: #334155; margin-top: 6px; line-height: 1.65; }
.exp-achievements li { font-size: 0.79rem; color: #475569; margin: 3px 0 3px 16px; }
.skills-row { display: flex; flex-wrap: wrap; gap: 6px; font-size: 0.78rem; color: var(--muted); }
.skill-sep::before { content: "·"; margin-right: 6px; color: var(--sky); }
.summary-text { font-size: 0.84rem; color: #334155; line-height: 1.7; }`,

      timeline: `
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&family=Roboto+Slab:wght@600;700&display=swap');
:root { --indigo: #6366F1; --text: #1F2937; --muted: #6B7280; --bg: #ffffff; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Roboto', sans-serif; font-size: 14px; color: var(--text); background: var(--bg); width: 794px; min-height: 1123px; }
.header { background: var(--indigo); color: #fff; padding: 28px 36px; display: flex; justify-content: space-between; align-items: center; }
.header-left .name { font-family: 'Roboto Slab', serif; font-size: 1.8rem; font-weight: 700; }
.header-left .job-title { font-size: 0.9rem; color: #C7D2FE; margin-top: 4px; }
.header-left .contact-row { display: flex; gap: 14px; margin-top: 8px; font-size: 0.76rem; color: #E0E7FF; }
.avatar { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid #fff; }
.monogram { width: 90px; height: 90px; border-radius: 50%; background: #fff; color: var(--indigo); font-size: 2rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.body { padding: 32px 36px; }
.summary-box { background: #EEF2FF; border-radius: 8px; padding: 14px 16px; font-size: 0.83rem; color: #3730A3; line-height: 1.6; margin-bottom: 28px; }
.timeline { position: relative; padding-left: 28px; }
.timeline::before { content: ''; position: absolute; left: 8px; top: 0; bottom: 0; width: 3px; background: var(--indigo); border-radius: 2px; }
.tl-item { position: relative; margin-bottom: 22px; }
.tl-dot { position: absolute; left: -24px; top: 4px; width: 13px; height: 13px; border-radius: 50%; background: var(--indigo); border: 2px solid #fff; box-shadow: 0 0 0 2px var(--indigo); }
.tl-card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; }
.tl-date-badge { display: inline-block; background: var(--indigo); color: #fff; border-radius: 12px; padding: 1px 8px; font-size: 0.7rem; margin-bottom: 4px; }
.tl-position { font-family: 'Roboto Slab', serif; font-size: 0.95rem; font-weight: 600; }
.tl-company { font-size: 0.82rem; color: var(--muted); }
.tl-desc { font-size: 0.8rem; color: #374151; margin-top: 6px; line-height: 1.5; }
.tl-achievements li { font-size: 0.78rem; color: #4B5563; margin: 2px 0 2px 14px; }
.section-header { font-family: 'Roboto Slab', serif; font-size: 1rem; font-weight: 700; color: var(--indigo); margin-bottom: 14px; margin-top: 24px; }
.skill-tag { display: inline-block; background: #EEF2FF; color: #4338CA; border-radius: 6px; padding: 3px 10px; font-size: 0.75rem; margin: 2px; border: 1px solid #C7D2FE; }`,

      bold: `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
:root { --dark: #0F172A; --red: #EF4444; --text: #111827; --muted: #6B7280; --white: #ffffff; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Montserrat', sans-serif; font-size: 14px; color: var(--text); background: #fff; width: 794px; min-height: 1123px; }
.wrapper { display: flex; min-height: 1123px; }
.sidebar { width: 38%; background: var(--dark); color: var(--white); padding: 40px 24px; display: flex; flex-direction: column; gap: 28px; }
.main { width: 62%; padding: 36px 28px; display: flex; flex-direction: column; gap: 24px; }
.avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--red); display: block; margin: 0 auto; }
.monogram { width: 100px; height: 100px; border-radius: 50%; background: var(--red); color: #fff; font-size: 2.5rem; font-weight: 900; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
.name { font-size: 1.6rem; font-weight: 900; text-align: center; text-transform: uppercase; color: var(--red); letter-spacing: 0.04em; margin-top: 14px; }
.job-title { font-size: 0.8rem; text-align: center; color: #94A3B8; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; }
.red-divider { border: none; border-top: 3px solid var(--red); margin: 12px 0; }
.s-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--red); margin-bottom: 8px; }
.contact-item { font-size: 0.77rem; color: #94A3B8; display: flex; gap: 8px; margin-bottom: 5px; }
.skill-pill { display: inline-block; border: 1px solid var(--red); color: #FDA5A5; border-radius: 6px; padding: 3px 10px; font-size: 0.72rem; margin: 2px; font-weight: 600; }
.main-section-title { font-size: 0.8rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; border-left: 4px solid var(--red); padding-left: 10px; margin-bottom: 14px; color: var(--text); }
.exp-position { font-size: 1rem; font-weight: 700; color: var(--text); }
.exp-company { font-size: 0.85rem; color: var(--red); font-weight: 600; }
.exp-dates { font-size: 0.74rem; color: var(--muted); margin-top: 2px; }
.exp-desc { font-size: 0.81rem; color: #374151; margin-top: 6px; line-height: 1.5; }
.exp-achievements li { font-size: 0.79rem; color: #374151; margin: 3px 0 3px 14px; list-style-type: square; }
.exp-achievements li::marker { color: var(--red); }
.yoe-badge { display: inline-flex; align-items: center; gap: 6px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 6px 12px; font-size: 0.78rem; font-weight: 700; color: var(--red); margin-bottom: 16px; }`,

      compact: `
@import url('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&display=swap');
:root { --blue: #1D4ED8; --text: #374151; --muted: #6B7280; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Lato', sans-serif; font-size: 13px; color: var(--text); background: #fff; width: 794px; min-height: 1123px; }
.header { background: var(--blue); color: #fff; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
.header-text .name { font-size: 1.5rem; font-weight: 700; }
.header-text .job-title { font-size: 0.82rem; color: #BFDBFE; margin-top: 2px; }
.header-text .contact-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 5px; font-size: 0.72rem; color: #DBEAFE; }
.avatar { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.5); }
.monogram { width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.2); color: #fff; font-size: 1.5rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.body { padding: 14px 24px; }
.section { margin-bottom: 12px; }
.section-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--blue); border-bottom: 1px solid #DBEAFE; padding-bottom: 3px; margin-bottom: 8px; }
.exp-row { display: flex; justify-content: space-between; }
.exp-position { font-size: 0.88rem; font-weight: 700; }
.exp-company { font-size: 0.78rem; color: var(--muted); }
.exp-dates { font-size: 0.73rem; color: var(--muted); font-style: italic; white-space: nowrap; }
.exp-desc { font-size: 0.78rem; color: var(--text); margin-top: 3px; line-height: 1.4; }
.exp-achievements li { font-size: 0.76rem; margin: 1px 0 1px 14px; }
.hr { border: none; border-top: 1px solid #E5E7EB; margin: 8px 0; }
.skills-inline { font-size: 0.78rem; color: var(--text); }`,

      elegant: `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
:root { --cream: #F8F4F0; --gold: #9D7A54; --text: #2D2D2D; --muted: #7A7A7A; --white: #ffffff; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Lato', sans-serif; font-size: 14px; color: var(--text); background: #fff; width: 794px; min-height: 1123px; }
.wrapper { display: flex; min-height: 1123px; }
.sidebar { width: 28%; background: var(--cream); padding: 36px 18px; display: flex; flex-direction: column; gap: 22px; border-right: 1px solid #EDE8E3; }
.main { width: 72%; padding: 36px 30px; display: flex; flex-direction: column; gap: 22px; }
.avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--gold); display: block; margin: 0 auto; }
.monogram { width: 100px; height: 100px; border-radius: 50%; background: var(--gold); color: #fff; font-family: 'Playfair Display', serif; font-size: 2.2rem; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
.name { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; text-align: center; color: var(--text); margin-top: 12px; }
.job-title { font-family: 'Playfair Display', serif; font-size: 0.82rem; font-style: italic; text-align: center; color: var(--gold); margin-top: 4px; }
.s-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--gold); border-bottom: 1px solid #D4B896; padding-bottom: 3px; margin-bottom: 10px; }
.contact-item { font-size: 0.76rem; color: var(--muted); margin-bottom: 4px; }
.skill-tag { display: inline-block; border: 1px solid var(--gold); color: var(--gold); border-radius: 4px; padding: 2px 8px; font-size: 0.72rem; margin: 2px; }
.main-section-title { font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 700; color: var(--text); border-bottom: 1px solid var(--gold); padding-bottom: 5px; margin-bottom: 14px; }
.section-wrap { background: #fff; border-radius: 6px; padding: 14px 16px; box-shadow: 0 1px 6px rgba(157,122,84,0.08); margin-bottom: 14px; }
.exp-position { font-weight: 700; font-size: 0.95rem; }
.exp-company { font-size: 0.84rem; color: var(--muted); }
.exp-dates { font-size: 0.76rem; color: var(--gold); font-style: italic; }
.exp-desc { font-size: 0.81rem; color: var(--text); margin-top: 6px; font-style: italic; line-height: 1.6; }
.exp-achievements li { font-size: 0.79rem; color: #4A4A4A; margin: 3px 0 3px 16px; }
.edu-school { font-weight: 700; font-size: 0.9rem; }
.edu-degree { font-size: 0.82rem; font-style: italic; color: var(--muted); }`,

      colorful: `
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Open+Sans:wght@400;500&display=swap');
:root { --teal: #06B6D4; --purple: #8B5CF6; --pink: #EC4899; --text: #1F2937; --muted: #6B7280; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--text); background: #fff; width: 794px; min-height: 1123px; }
.wrapper { display: flex; min-height: 1123px; }
.sidebar { width: 32%; background: linear-gradient(160deg, var(--teal), var(--purple)); color: #fff; padding: 36px 20px; display: flex; flex-direction: column; gap: 22px; }
.main { width: 68%; padding: 32px 26px; display: flex; flex-direction: column; gap: 20px; }
.avatar { width: 105px; height: 105px; border-radius: 50%; object-fit: cover; border: 4px solid #fff; display: block; margin: 0 auto; }
.monogram { width: 105px; height: 105px; border-radius: 50%; background: rgba(255,255,255,0.25); color: #fff; font-family: 'Quicksand', sans-serif; font-size: 2.5rem; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 3px solid rgba(255,255,255,0.5); }
.name { font-family: 'Quicksand', sans-serif; font-size: 1.4rem; font-weight: 700; text-align: center; margin-top: 12px; }
.job-title { font-size: 0.82rem; text-align: center; color: rgba(255,255,255,0.85); margin-top: 4px; }
.s-label { font-size: 0.64rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.7); margin-bottom: 8px; }
.contact-item { font-size: 0.77rem; color: rgba(255,255,255,0.9); display: flex; gap: 7px; margin-bottom: 5px; }
.skill-pill-t { display: inline-block; background: rgba(6,182,212,0.2); border: 1px solid #67E8F9; color: #CFFAFE; border-radius: 20px; padding: 2px 10px; font-size: 0.72rem; margin: 2px; }
.skill-pill-p { display: inline-block; background: rgba(139,92,246,0.2); border: 1px solid #C4B5FD; color: #EDE9FE; border-radius: 20px; padding: 2px 10px; font-size: 0.72rem; margin: 2px; }
.skill-pill-k { display: inline-block; background: rgba(236,72,153,0.2); border: 1px solid #F9A8D4; color: #FCE7F3; border-radius: 20px; padding: 2px 10px; font-size: 0.72rem; margin: 2px; }
.avail-badge { display: inline-block; background: #10B981; color: #fff; border-radius: 12px; padding: 3px 10px; font-size: 0.72rem; font-weight: 600; }
.main-section-title { font-family: 'Quicksand', sans-serif; font-size: 0.9rem; font-weight: 700; margin-bottom: 12px; }
.section-teal .main-section-title { border-left: 4px solid var(--teal); padding-left: 8px; color: var(--teal); }
.section-purple .main-section-title { border-left: 4px solid var(--purple); padding-left: 8px; color: var(--purple); }
.section-pink .main-section-title { border-left: 4px solid var(--pink); padding-left: 8px; color: var(--pink); }
.exp-card { border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; border: 1px solid #F3F4F6; background: linear-gradient(135deg, #F0FDFF 0%, #FAF5FF 100%); }
.exp-position { font-family: 'Quicksand', sans-serif; font-size: 0.95rem; font-weight: 700; color: var(--purple); }
.exp-company { font-size: 0.82rem; color: var(--muted); }
.exp-dates { font-size: 0.74rem; color: var(--teal); font-weight: 600; margin-top: 2px; }
.exp-desc { font-size: 0.8rem; color: #374151; margin-top: 5px; line-height: 1.5; }
.exp-achievements li { font-size: 0.78rem; color: #4B5563; margin: 2px 0 2px 14px; }
.career-chip { display: inline-block; background: #FDF2F8; color: #9D174D; border: 1px solid #FBCFE8; border-radius: 12px; padding: 2px 10px; font-size: 0.72rem; margin: 2px; }`,

      professional: `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
:root { --blue: #0369A1; --sidebar-bg: #F1F5F9; --text: #1E293B; --muted: #64748B; --accent: #E0F2FE; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; color: var(--text); background: #fff; width: 794px; min-height: 1123px; }
.wrapper { display: flex; min-height: 1123px; }
.sidebar { width: 30%; background: var(--sidebar-bg); padding: 32px 18px; display: flex; flex-direction: column; gap: 22px; border-right: 1px solid #E2E8F0; }
.main { width: 70%; padding: 32px 28px; display: flex; flex-direction: column; gap: 20px; }
.avatar { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 3px solid var(--blue); display: block; margin: 0 auto; }
.monogram { width: 96px; height: 96px; border-radius: 50%; background: var(--blue); color: #fff; font-size: 2.2rem; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
.name { font-size: 1.25rem; font-weight: 700; text-align: center; color: var(--text); margin-top: 12px; }
.job-title { font-size: 0.82rem; text-align: center; color: var(--blue); font-weight: 500; margin-top: 4px; }
.s-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--blue); margin-bottom: 8px; }
.contact-item { font-size: 0.76rem; color: var(--muted); display: flex; gap: 6px; margin-bottom: 4px; }
.skill-bar-wrap { margin-bottom: 6px; }
.skill-bar-name { font-size: 0.76rem; color: var(--text); margin-bottom: 2px; font-weight: 500; }
.skill-bar-track { background: #E2E8F0; border-radius: 4px; height: 4px; }
.skill-bar-fill { background: var(--blue); border-radius: 4px; height: 4px; width: 75%; }
.yoe-stat { background: var(--blue); color: #fff; border-radius: 8px; padding: 8px 12px; text-align: center; }
.yoe-stat .num { font-size: 1.4rem; font-weight: 700; display: block; }
.yoe-stat .label { font-size: 0.68rem; display: block; opacity: 0.85; }
.main-section-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--blue); border-bottom: 2px solid var(--accent); padding-bottom: 4px; margin-bottom: 14px; }
.summary-box { background: var(--accent); border-radius: 6px; padding: 12px 14px; font-size: 0.83rem; line-height: 1.6; color: #0C4A6E; }
.exp-position { font-size: 0.95rem; font-weight: 600; }
.exp-company { font-size: 0.84rem; color: var(--muted); }
.exp-date-badge { display: inline-block; font-size: 0.72rem; color: var(--muted); background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 4px; padding: 1px 7px; float: right; margin-top: -18px; }
.exp-desc { font-size: 0.81rem; color: #334155; margin-top: 6px; line-height: 1.55; }
.exp-achievements li { font-size: 0.79rem; color: #475569; margin: 3px 0 3px 16px; }`,

      corporate: `
@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700&display=swap');
:root { --navy: #1E3A5F; --blue: #1D4ED8; --sidebar-bg: #EFF6FF; --text: #1E293B; --muted: #64748B; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Source Sans 3', sans-serif; font-size: 14px; color: var(--text); background: #fff; width: 794px; min-height: 1123px; }
.top-header { background: var(--navy); color: #fff; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
.th-left .name { font-size: 1.7rem; font-weight: 700; }
.th-left .job-title { font-size: 0.88rem; color: #93C5FD; margin-top: 3px; font-weight: 600; }
.th-right { text-align: right; font-size: 0.76rem; color: #CBD5E1; line-height: 1.7; }
.avatar { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.4); }
.monogram { width: 80px; height: 80px; border-radius: 50%; background: var(--blue); color: #fff; font-size: 1.8rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.content { display: flex; min-height: calc(1123px - 88px); }
.sidebar { width: 28%; background: var(--sidebar-bg); padding: 24px 18px; display: flex; flex-direction: column; gap: 20px; border-right: 1px solid #DBEAFE; }
.main { width: 72%; padding: 24px 28px; display: flex; flex-direction: column; gap: 20px; }
.s-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--blue); margin-bottom: 8px; }
.skill-bar-wrap { margin-bottom: 7px; }
.skill-bar-name { font-size: 0.76rem; font-weight: 600; color: var(--text); margin-bottom: 3px; }
.skill-bar-track { background: #DBEAFE; border-radius: 3px; height: 5px; }
.skill-bar-fill { background: var(--blue); border-radius: 3px; height: 5px; width: 80%; }
.avail-badge { display: inline-block; background: #10B981; color: #fff; border-radius: 6px; padding: 3px 10px; font-size: 0.72rem; font-weight: 600; }
.career-chip { display: inline-block; background: #EFF6FF; color: var(--navy); border: 1px solid #BFDBFE; border-radius: 4px; padding: 2px 8px; font-size: 0.72rem; margin: 2px; }
.main-section-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--blue); border-bottom: 2px solid #BFDBFE; padding-bottom: 4px; margin-bottom: 12px; }
.summary-text { font-size: 0.83rem; color: #334155; line-height: 1.6; }
.exp-entry { border-left: 3px solid var(--blue); padding-left: 12px; margin-bottom: 14px; }
.exp-position { font-size: 0.95rem; font-weight: 700; }
.exp-company { font-size: 0.83rem; color: var(--muted); }
.exp-dates { font-size: 0.74rem; color: var(--muted); font-style: italic; }
.exp-desc { font-size: 0.8rem; color: #374151; margin-top: 5px; line-height: 1.5; }
.exp-achievements li { font-size: 0.78rem; color: #475569; margin: 2px 0 2px 14px; }`,

      dark: `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
:root { --sidebar-bg: #0D1117; --main-bg: #161B22; --card-bg: #1C2128; --text: #E6EDF3; --muted: #8B949E; --accent: #58A6FF; --border: #30363D; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; font-size: 14px; color: var(--text); background: var(--main-bg); width: 794px; min-height: 1123px; }
.wrapper { display: flex; min-height: 1123px; }
.sidebar { width: 32%; background: var(--sidebar-bg); padding: 32px 20px; display: flex; flex-direction: column; gap: 24px; border-right: 1px solid var(--border); }
.main { width: 68%; padding: 32px 26px; display: flex; flex-direction: column; gap: 22px; }
.avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent); display: block; margin: 0 auto; }
.monogram { width: 100px; height: 100px; border-radius: 50%; background: var(--card-bg); color: var(--accent); font-family: 'JetBrains Mono', monospace; font-size: 2.2rem; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 2px solid var(--accent); }
.name { font-family: 'JetBrains Mono', monospace; font-size: 1.2rem; font-weight: 700; text-align: center; color: var(--accent); margin-top: 12px; }
.job-title { font-size: 0.8rem; text-align: center; color: var(--muted); margin-top: 4px; }
.s-label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent); margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
.contact-item { font-size: 0.76rem; color: var(--muted); display: flex; gap: 6px; margin-bottom: 4px; }
.skill-pill { display: inline-block; border: 1px solid var(--accent); color: var(--accent); border-radius: 6px; padding: 2px 9px; font-size: 0.72rem; margin: 2px; background: rgba(88,166,255,0.08); font-family: 'JetBrains Mono', monospace; }
.social-link { font-size: 0.76rem; color: var(--accent); display: flex; gap: 6px; margin-bottom: 4px; }
.main-section-title { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 14px; }
.summary-code { background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: #A5D6FF; line-height: 1.6; border-left: 3px solid var(--accent); }
.exp-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px; margin-bottom: 12px; }
.exp-position { font-size: 0.95rem; font-weight: 600; color: var(--accent); }
.exp-company { font-size: 0.82rem; color: var(--muted); margin-top: 1px; }
.exp-dates { font-size: 0.73rem; color: var(--muted); margin-top: 2px; font-family: 'JetBrains Mono', monospace; }
.exp-desc { font-size: 0.8rem; color: #A8B2C0; margin-top: 6px; line-height: 1.55; }
.exp-achievements li { font-size: 0.78rem; color: var(--muted); margin: 3px 0 3px 14px; list-style: none; }
.exp-achievements li::before { content: "▸ "; color: var(--accent); }`,
    };

    const templateInstructions: Record<string, string> = {
      modern:
        'Use .wrapper flex container. Left .sidebar (30%) + right .main (70%). Place avatar/monogram at top of sidebar. Use .skill-pill for skills. Use .summary-box for summary. Use .main-section-title for section headers. Use .exp-dates with float:right for date alignment.',
      classic:
        'Single column. Use .header for centered name/title. Use <hr class="divider"> between header and body. Use .section-title with double border. Use .exp-header with flex justify-between for position/date row.',
      creative:
        'Use .wrapper flex. Left .sidebar (35%) with purple bg + right .main (65%). Use .exp-card for experience entries. Use .summary-quote with amber left border. Use .career-chip for career interests. Use .avail-badge in green for availability.',
      minimalist:
        'Single column with generous padding. Name in 2.6rem light weight. Use .section-label as inline-block with sky underline. Use .exp-date-badge float:right. Use .skills-row with .skill-sep spans. Keep everything sparse and open.',
      timeline:
        'Use .header with indigo bg. Below: .body with .summary-box then .timeline. Timeline uses ::before pseudo for vertical line. Each .tl-item has .tl-dot positioned absolutely + .tl-card. Use .tl-date-badge on each item.',
      bold: 'Use .wrapper flex. Left .sidebar (38%) near-black bg + right .main (62%). Name all-caps in .red. Use .red-divider. Use .yoe-badge for years of experience stat. Use .main-section-title with red left border. List markers use red squares.',
      compact:
        'Use .header with blue bg. Compact .body. Small font sizes throughout. Use .hr between sections. Use .exp-row flex for position/dates. Keep everything tight — no wasted vertical space.',
      elegant:
        'Use .wrapper flex. Left .sidebar (28%) cream bg + right .main (72%). Wrap main sections in .section-wrap with box-shadow. Use Playfair Display serif headings. Use .skill-tag with gold border. Keep typography elegant and refined.',
      colorful:
        'Use .wrapper flex. Left .sidebar (32%) with teal-purple gradient + right .main (68%). Alternate .skill-pill-t, .skill-pill-p, .skill-pill-k for colorful skills. Alternate section colors: .section-teal, .section-purple, .section-pink. Use .exp-card with gradient bg.',
      professional:
        'Use .wrapper flex. Left .sidebar (30%) light gray + right .main (70%). Use .skill-bar-wrap with .skill-bar-track/.skill-bar-fill for progress bars. Show .yoe-stat block if yearsOfExperience provided. Use .summary-box in light blue.',
      corporate:
        'Use .top-header full-width navy bar with flex justify-between. Below: .content flex with .sidebar (28%) + .main (72%). Use .skill-bar-track/.skill-bar-fill. Use .exp-entry with blue left border. Section titles all-caps.',
      dark: 'Use .wrapper flex. Left .sidebar (32%) #0D1117 + right .main (68%) #161B22. Wrap experience in .exp-card dark cards. Use .summary-code for summary block. Skills as .skill-pill with blue border. All text on dark backgrounds. Accent color #58A6FF throughout.',
    };

    const cssScaffold = cssScaffolds[template] ?? cssScaffolds['modern'];
    const instruction =
      templateInstructions[template] ?? templateInstructions['modern'];

    return `You are a world-class resume designer and expert frontend developer. Generate a complete, pixel-perfect, print-ready HTML5 resume.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT RULES — READ CAREFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Return ONLY valid HTML starting with <!DOCTYPE html>
• No markdown, no code fences, no explanation text
• Every CSS class you use MUST be defined in your <style> block
• Do NOT omit any provided data field

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEMPLATE: ${template.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${instruction}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CSS SCAFFOLD — Start with this exact CSS, then add any extra rules needed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${cssScaffold}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PROFILE PICTURE:
   • If personalInfo.profilePicture is a URL or a data: URI → <img class="avatar" src="VALUE" alt="Profile"> (use the value as-is in the src attribute)
   • If not provided → <div class="monogram">FIRST_INITIAL</div> (use template's monogram style)

2. SECTIONS (render only if data exists):
   • Header: full name, job title, email, phone, location, social links
   • Professional Summary (field: "summary") — use template's summary style class
   • Work Experience (field: "experience") — show position, company, startDate–endDate, description, achievements as <ul>
   • Skills (field: "skills") — use template's skill display style
   • Education (field: "education") — render all entries
   • Career Interests (field: "careerScopes") — use template's tag/chip style
   • Years of Experience (field: "yearsOfExperience") — show as stat/badge in sidebar if present
   • Availability (field: "availability") — show as badge if present

3. TYPOGRAPHY & SPACING:
   • A4 width: 794px, min-height: 1123px
   • Body font size: 13–14px base
   • Line height: 1.4–1.6
   • Consistent 8px spacing grid (padding/margins in multiples of 8)
   • Print-safe: add @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

4. VISUAL HIERARCHY (per experience entry):
   Position title (largest/boldest) → Company (secondary) → Dates (smallest, muted) → Description → Achievement bullets

5. SOCIAL LINKS: Display as "Platform: URL" or "● Platform" — never bare URLs alone

6. DATES: Display as-is from data (already human-readable, e.g. "January 2022")`;
  }

  private async generateHTMLContent(
    buildResumeDTO: BuildResumeDTO,
  ): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(buildResumeDTO.template);

      // If profilePicture is a base64 data URI, extract it before sending to GPT
      // so the large base64 string doesn't consume the token budget.
      // We replace it with a sentinel token and substitute it back after generation.
      const AVATAR_TOKEN = '__AVATAR_BASE64__';
      const avatarBase64 =
        buildResumeDTO.personalInfo?.profilePicture?.startsWith('data:')
          ? buildResumeDTO.personalInfo.profilePicture
          : null;

      const dtoForGPT = avatarBase64
        ? {
            ...buildResumeDTO,
            personalInfo: {
              ...buildResumeDTO.personalInfo,
              profilePicture: AVATAR_TOKEN,
            },
          }
        : buildResumeDTO;

      const completion = await this.openAI.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 4096,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Generate the resume HTML for this candidate data:\n\n${JSON.stringify(dtoForGPT, null, 2)}`,
          },
        ],
      });

      const content = completion.choices?.[0]?.message?.content;
      if (!content || !content.toLowerCase().includes('<html')) {
        throw new Error('OpenAI did not return valid HTML');
      }

      // Strip any accidental markdown code fences
      let cleanedHTML = content
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      // Substitute the sentinel token back with the real base64 image
      if (avatarBase64) {
        cleanedHTML = cleanedHTML.split(AVATAR_TOKEN).join(avatarBase64);
      }

      return cleanedHTML;
    } catch (error) {
      this.logger.error(
        { err: error },
        'Error generating resume content with OpenAI',
      );
      throw new Error('Failed to generate resume content');
    }
  }

  private async pdfGenerator(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
        displayHeaderFooter: false,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
