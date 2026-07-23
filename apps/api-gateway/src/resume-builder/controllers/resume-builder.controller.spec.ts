import 'reflect-metadata';
import { RESUME_BUILDER_SERVICE } from '@app/contracts';
import { RESUME } from '@app/contracts/constants/domain/resume.constant';
import { rpcCall } from '../../utils/rpc-call';
import { ResumeBuilderController } from './resume-builder.controller';

jest.mock('../../utils/rpc-call', () => ({ rpcCall: jest.fn() }));

describe('ResumeBuilderController', () => {
  const client = {};
  const aiStream = { pipe: jest.fn() };
  const aiProfileBio = { getMessages: jest.fn() };
  const controller = new ResumeBuilderController(
    client as any,
    aiStream as any,
    aiProfileBio as any,
  );
  const rpc = rpcCall as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    rpc.mockResolvedValue({});
  });

  it('removes profile images from AI input and preserves request identity fields', async () => {
    const dto = {
      personalInfo: {
        fullName: 'Candidate',
        profilePicture: 'data:image/png;base64,x',
      },
      template: 'modern',
      sectionOrder: ['skills', 'experience'],
    } as any;
    rpc.mockResolvedValue({
      personalInfo: { fullName: 'Wrong AI name' },
      template: 'wrong',
      sectionOrder: ['wrong'],
      summary: 'Generated',
    });
    const result = await controller.generateResume(dto);
    expect(rpc).toHaveBeenCalledWith(
      client,
      RESUME_BUILDER_SERVICE.ACTIONS.GENERATE_RESUME,
      expect.objectContaining({
        personalInfo: expect.objectContaining({ profilePicture: undefined }),
      }),
      RESUME.CONTROLLER_TIMEOUT,
    );
    expect(result).toMatchObject({
      personalInfo: dto.personalInfo,
      template: 'modern',
      sectionOrder: ['skills', 'experience'],
      summary: 'Generated',
    });
    expect(result.sectionOrder).not.toBe(dto.sectionOrder);
  });

  it('keeps generated text-resume content but enforces the selected template', async () => {
    rpc.mockResolvedValue({ template: 'wrong', summary: 'Generated' });
    const result = await controller.generateResumeFromText({
      text: 'resume',
      template: 'classic',
    } as any);
    expect(result).toMatchObject({ template: 'classic', summary: 'Generated' });
  });

  it('delegates non-streaming builder operations with the production timeout', async () => {
    const cases: Array<[string, any]> = [
      ['buildResume', RESUME_BUILDER_SERVICE.ACTIONS.BUILD_RESUME],
      ['optimizeResume', RESUME_BUILDER_SERVICE.ACTIONS.OPTIMIZE_RESUME],
      [
        'generateCoverLetter',
        RESUME_BUILDER_SERVICE.ACTIONS.GENERATE_COVER_LETTER,
      ],
      ['polishCoverLetter', RESUME_BUILDER_SERVICE.ACTIONS.POLISH_COVER_LETTER],
      [
        'generateCoverLetterPdf',
        RESUME_BUILDER_SERVICE.ACTIONS.GENERATE_COVER_LETTER_PDF,
      ],
      [
        'generateInterviewPrepPdf',
        RESUME_BUILDER_SERVICE.ACTIONS.GENERATE_INTERVIEW_PREP_PDF,
      ],
    ];
    for (const [method, action] of cases) {
      const dto = { value: method };
      await (controller as any)[method](dto);
      expect(rpc).toHaveBeenLastCalledWith(
        client,
        action,
        dto,
        RESUME.CONTROLLER_TIMEOUT,
      );
    }
  });

  it('builds a cover-letter stream prompt with safe defaults', async () => {
    const res = {} as any;
    await controller.streamCoverLetter(
      { employeeName: 'A', companyName: 'B' } as any,
      res,
    );
    expect(aiStream.pipe).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('available positions'),
        }),
      ]),
      0.6,
      res,
      RESUME.AI_COVER_LETTER_MAX_TOKENS,
    );
  });

  it('streams cover-letter polishing using only submitted content', async () => {
    const res = {} as any;
    await controller.streamPolishCoverLetter(
      { coverLetterText: 'Original letter' } as any,
      res,
    );
    expect(aiStream.pipe).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('Original letter'),
        }),
      ]),
      0.4,
      res,
      RESUME.AI_COVER_LETTER_MAX_TOKENS,
    );
  });

  it('strips embedded profile images before streaming resume optimization', async () => {
    const res = {} as any;
    await controller.streamOptimizeResume(
      {
        personalInfo: {
          fullName: 'A',
          profilePicture: 'data:image/png;base64,x',
        },
      } as any,
      res,
    );
    const messages = aiStream.pipe.mock.calls[0][0];
    expect(messages[1].content).not.toContain('data:image/png');
    expect(messages[1].content).toContain('"fullName": "A"');
  });

  it('uses the profile-bio prompt builder for refinement streams', async () => {
    const dto = { bio: 'Developer' } as any;
    const messages = [{ role: 'user', content: 'refine' }];
    const res = {} as any;
    aiProfileBio.getMessages.mockReturnValue(messages);
    await controller.streamRefineBio(dto, res);
    expect(aiStream.pipe).toHaveBeenCalledWith(
      messages,
      0.7,
      res,
      RESUME.AI_REFINE_MAX_TOKENS,
    );
  });
});
