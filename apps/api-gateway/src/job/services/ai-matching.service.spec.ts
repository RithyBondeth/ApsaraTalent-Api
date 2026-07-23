import { AiMatchingService } from './ai-matching.service';

describe('AiMatchingService', () => {
  const service = new AiMatchingService();
  const employee = { skills: ['TypeScript'], job: 'Engineer' };
  const company = { name: 'Apsara', jobs: ['Backend Engineer'] };

  it('builds strict match-explanation messages with optional Khmer output', () => {
    const messages = service.getMatchExplanationMessages(
      employee,
      company,
      'km',
    );
    expect(messages[0].content).toContain('SCORE:');
    expect(messages[0].content).toContain('Khmer');
    expect(messages[1].content).toContain('TypeScript');
    expect(messages[1].content).toContain('Apsara');
  });

  it('tailors interview preparation to a named round', () => {
    const messages = service.getInterviewPrepMessages(
      employee,
      company,
      'Technical Round',
    );
    expect(messages[0].content).toContain('Technical Round');
    expect(messages[0].content).toContain('NDJSON');
  });

  it('omits round-specific instructions for a general interview', () => {
    const messages = service.getInterviewPrepMessages(employee, company);
    expect(messages[0].content).not.toContain('IMPORTANT: Tailor');
  });

  it('builds skill-gap NDJSON instructions and Khmer language constraints', () => {
    const messages = service.getSkillGapMessages(employee, company, 'km');
    expect(messages[0].content).toContain('"t":"matched"');
    expect(messages[0].content).toContain('estimatedWeeks');
    expect(messages[0].content).toContain('Khmer');
  });
});
