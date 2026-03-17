import { ResumeTemplate } from '@app/common/database/entities/resume-template.entity';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

export const RESUME_TEMPLATE_SEEDS: Omit<ResumeTemplate, 'id' | 'createdAt'>[] =
  [
    {
      title: 'Modern Professional',
      description:
        'Two-column layout with a dark navy sidebar and blue accents. Clean sans-serif typography. Ideal for tech and business roles.',
      image: '',
      price: 0,
      isPremium: false,
    },
    {
      title: 'Classic Professional',
      description:
        'Single-column, serif-font layout inspired by traditional executive resumes. Black and white, timeless and authoritative.',
      image: '',
      price: 0,
      isPremium: false,
    },
    {
      title: 'Creative Design',
      description:
        'Bold purple sidebar with amber accents. Designed for creative, marketing, and design professionals who want to stand out.',
      image: '',
      price: 0,
      isPremium: false,
    },
    {
      title: 'Minimalist Pro',
      description:
        'Generous whitespace, sky-blue accents, and clean DM Sans typography. Perfect for those who believe less is more.',
      image: '',
      price: 0,
      isPremium: false,
    },
    {
      title: 'Timeline Resume',
      description:
        'Visual vertical timeline with indigo dots and card entries. Makes career progression easy to read at a glance.',
      image: '',
      price: 0,
      isPremium: false,
    },
    {
      title: 'Bold Statement',
      description:
        'High-contrast dark panel with red accents and Montserrat Black typography. For professionals who want maximum impact.',
      image: '',
      price: 9.99,
      isPremium: true,
    },
    {
      title: 'Compact One-Page',
      description:
        'Tight single-column layout optimised to fit everything on one A4 page. Perfect for concise, no-frills applications.',
      image: '',
      price: 0,
      isPremium: false,
    },
    {
      title: 'Elegant Style',
      description:
        'Warm cream sidebar, Playfair Display serif headings, and gold accents. A premium feel for senior and executive roles.',
      image: '',
      price: 9.99,
      isPremium: true,
    },
    {
      title: 'Colorful Vibrant',
      description:
        'Teal-to-purple gradient sidebar, rotating color section headers, and Quicksand font. Eye-catching and modern.',
      image: '',
      price: 4.99,
      isPremium: true,
    },
    {
      title: 'Professional Clean',
      description:
        'Light gray sidebar with skill progress bars and IBM Plex Sans font. Conservative, polished, and job-market ready.',
      image: '',
      price: 0,
      isPremium: false,
    },
    {
      title: 'Corporate Executive',
      description:
        'Full-width dark navy header, structured grid layout, and blue progress bars. Built for corporate and executive applications.',
      image: '',
      price: 9.99,
      isPremium: true,
    },
    {
      title: 'Dark Mode',
      description:
        'GitHub-inspired dark theme with blue accents and JetBrains Mono typography. Perfect for developers and tech professionals.',
      image: '',
      price: 4.99,
      isPremium: true,
    },
  ];

@Injectable()
export class ResumeTemplateSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(ResumeTemplate)
    private readonly resumeTemplateRepository: Repository<ResumeTemplate>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ResumeTemplateSeedService.name);
  }

  async onModuleInit(): Promise<void> {
    await this.seedTemplates();
  }

  private async seedTemplates(): Promise<void> {
    try {
      for (const seed of RESUME_TEMPLATE_SEEDS) {
        const exists = await this.resumeTemplateRepository.findOne({
          where: { title: seed.title },
        });
        if (!exists) {
          await this.resumeTemplateRepository.save(
            this.resumeTemplateRepository.create(seed),
          );
          this.logger.info(`Seeded resume template: "${seed.title}"`);
        }
      }
    } catch (error) {
      this.logger.error(
        { err: error },
        'Failed to seed resume templates',
      );
    }
  }
}
