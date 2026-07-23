import 'reflect-metadata';
import { RefineProfileBioType } from '@app/contracts/dtos/resume';
import { AiProfileBioService } from './ai-profile-bio.service';

describe('AiProfileBioService', () => {
  const service = new AiProfileBioService();

  it.each([
    RefineProfileBioType.EMPLOYEE_BIO,
    RefineProfileBioType.EMPLOYEE_JOB_TITLE,
    RefineProfileBioType.COMPANY_BIO,
    RefineProfileBioType.EXPERIENCE_DESCRIPTION,
    RefineProfileBioType.ACHIEVEMENT_BULLET,
    RefineProfileBioType.SKILL_SUGGESTION,
    RefineProfileBioType.EDUCATION_DESCRIPTION,
  ])('builds a strict two-message prompt for %s', (type) => {
    const messages = service.getMessages({
      type,
      currentText: 'Existing text',
      jobTitle: 'Backend Engineer',
      experience: '3 years',
      availability: 'Available',
      skills: ['TypeScript', 'Node.js'],
      careerScopes: ['Software'],
      companyName: 'Apsara',
      industry: 'Technology',
      openPositions: ['Engineer'],
      benefits: ['Remote'],
      values: ['Growth'],
    } as any);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual(expect.objectContaining({ role: 'system' }));
    expect(messages[1]).toEqual(expect.objectContaining({ role: 'user' }));
  });

  it('builds useful prompts when optional current text is absent', () => {
    const bio = service.getMessages({
      type: RefineProfileBioType.EMPLOYEE_BIO,
      skills: ['TypeScript'],
    } as any);
    expect(bio[1].content).toContain('Write a professional bio');
    const title = service.getMessages({
      type: RefineProfileBioType.EMPLOYEE_JOB_TITLE,
      skills: ['TypeScript'],
    } as any);
    expect(title[1].content).toContain('Suggest a professional job title');
    const company = service.getMessages({
      type: RefineProfileBioType.COMPANY_BIO,
      companyName: 'Apsara',
    } as any);
    expect(company[1].content).toContain('Write a company description');
  });
});
