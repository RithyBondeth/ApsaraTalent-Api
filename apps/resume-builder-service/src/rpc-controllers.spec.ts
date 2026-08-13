import 'reflect-metadata';
import { ResumeBuilderController } from './resumes/controllers/resume-builder.controller';
import { ResumeTemplateController } from './templates/controllers/resume-template.controller';

describe('Resume-builder RPC controllers', () => {
  it('delegates every resume generation operation', async () => {
    const methods = [
      'generateResume',
      'generateResumeFromText',
      'buildResume',
      'optimizeResume',
      'generateCoverLetter',
      'polishCoverLetter',
      'generateCoverLetterPdf',
      'generateInterviewPrepPdf',
    ];
    const service = Object.fromEntries(
      methods.map((method) => [method, jest.fn().mockResolvedValue({})]),
    ) as Record<string, jest.Mock>;
    const controller = new ResumeBuilderController(service as any);
    for (const method of methods) {
      const dto = { value: method } as any;
      await (controller as any)[method](dto);
      expect(service[method]).toHaveBeenCalledWith(dto);
    }
  });

  it('delegates template reads, creation, and search', async () => {
    const service = {
      findAllResumeTemplate: jest.fn().mockResolvedValue([]),
      findOneResumeTemplate: jest.fn().mockResolvedValue({}),
      createResumeTemplate: jest.fn().mockResolvedValue({}),
      searchResumeTemplate: jest.fn().mockResolvedValue([]),
    };
    const controller = new ResumeTemplateController(service as any);
    await controller.findAllResumeTemplate();
    await controller.findOneResumeTemplateById('template-1');
    const dto = { title: 'Template' } as any;
    const image = { filename: 'image.png' } as any;
    await controller.createResumeTemplate(dto, image);
    await controller.searchResumeTemplate({ query: 'modern' } as any);
    expect(service.createResumeTemplate).toHaveBeenCalledWith(dto, image);
  });
});
