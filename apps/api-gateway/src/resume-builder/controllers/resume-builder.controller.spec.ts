import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';
import { BuildResumeDTO } from '@app/contracts/dtos/resume';
import { AiQuotaGuard } from '@app/common/throttler/guards/ai-quota.guard';
import { RESUME_BUILDER_SERVICE } from '@app/contracts/constants/service-actions/resume-builder-service.constant';
import { ResumeBuilderController } from './resume-builder.controller';

function resume(): BuildResumeDTO {
  return {
    personalInfo: {
      fullName: 'Sokha Chan',
      email: 'sokha@example.com',
      phone: '012345678',
      profilePicture: 'data:image/jpeg;base64,aGVsbG8=',
      job: 'Software Engineer',
    },
    summary: 'Trusted summary',
    experience: [
      {
        company: 'Apsara Labs',
        position: 'Software Engineer',
        startDate: 'January 2023',
        endDate: 'Present',
        description: 'Trusted description',
        achievements: [],
      },
    ],
    skills: ['TypeScript'],
    sectionOrder: ['summary', 'experience', 'skills'],
    template: 'modern',
  };
}

describe('ResumeBuilderController AI generation', () => {
  const client = { send: jest.fn() } as unknown as ClientProxy;
  const controller = new ResumeBuilderController(client, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('applies the AI quota guard to initial resume generation', () => {
    const guards =
      Reflect.getMetadata(
        GUARDS_METADATA,
        ResumeBuilderController.prototype.generateResume,
      ) ?? [];

    expect(guards).toContain(AiQuotaGuard);
  });

  it('applies the AI quota guard to pasted-text generation', () => {
    const guards =
      Reflect.getMetadata(
        GUARDS_METADATA,
        ResumeBuilderController.prototype.generateResumeFromText,
      ) ?? [];

    expect(guards).toContain(AiQuotaGuard);
  });

  it('keeps identity, selected style and section order outside model control', async () => {
    const trusted = resume();
    const generatedDesign: NonNullable<BuildResumeDTO['design']> = {
      layout: 'right-sidebar',
      columnRatio: 'narrow',
      headerLayout: 'split',
      avatarPlacement: 'start',
      sidebarSections: ['skills', 'education'],
      palette: 'violet',
      typography: 'geometric',
      density: 'spacious',
      headerStyle: 'soft',
      sectionStyle: 'pill',
      cornerStyle: 'rounded',
      experienceStyle: 'timeline',
      skillsStyle: 'grid',
      educationStyle: 'cards',
      summaryStyle: 'highlight',
      decoration: 'geometric',
    };
    (client.send as jest.Mock).mockReturnValue(
      of({
        ...trusted,
        personalInfo: {
          fullName: 'Invented Name',
          email: 'invented@example.com',
        },
        summary: 'AI-generated summary',
        design: generatedDesign,
        template: 'dark',
        sectionOrder: ['education'],
      }),
    );

    const result = await controller.generateResume(trusted);

    expect(client.send).toHaveBeenCalledWith(
      RESUME_BUILDER_SERVICE.ACTIONS.GENERATE_RESUME,
      expect.objectContaining({
        personalInfo: expect.objectContaining({ profilePicture: undefined }),
      }),
    );
    expect(result.personalInfo).toEqual(trusted.personalInfo);
    expect(result.template).toBe('modern');
    expect(result.sectionOrder).toEqual(trusted.sectionOrder);
    expect(result.summary).toBe('AI-generated summary');
    expect(result.design).toEqual(generatedDesign);
  });
});
