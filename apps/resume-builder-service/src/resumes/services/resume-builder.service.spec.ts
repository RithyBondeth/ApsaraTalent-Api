import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { ResumeBuilderService } from './resume-builder.service';

const mockCreate = jest.fn();

// puppeteer 25 is ESM-only ("type": "module", no CommonJS build). Node 24
// handles `require()` of ESM natively, so production is unaffected — but
// Jest's CommonJS module registry does not, and this suite pulls puppeteer in
// transitively through PdfGeneratorService. This suite never drives a browser,
// so a stub is enough. pdf-generator.service.spec.ts mocks it the same way.
jest.mock('puppeteer', () => ({ launch: jest.fn() }));

describe('ResumeBuilderService', () => {
  const config = {
    get: jest.fn((key) => (key === 'openai.model' ? 'gpt-test' : 'key')),
  };
  const images = { optimizeProfilePicture: jest.fn() };
  const pdf = { generate: jest.fn() };
  const logger = { setContext: jest.fn(), error: jest.fn() };
  // Each generation task resolves its own endpoint through AiClientService
  // rather than the service holding one client for every model.
  const aiClient = {
    forTask: jest.fn(() => ({
      client: { chat: { completions: { create: mockCreate } } },
      model: 'gpt-test',
    })),
  };
  const service = new ResumeBuilderService(
    config as any,
    images as any,
    pdf as any,
    logger as any,
    aiClient as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key) =>
      key === 'openai.model' ? 'gpt-test' : 'key',
    );
    pdf.generate.mockResolvedValue(Buffer.from('pdf'));
  });

  it('optimizes a profile picture before rendering a PDF resume', async () => {
    images.optimizeProfilePicture.mockResolvedValue('data:image/optimized');
    const dto = {
      template: 'classic',
      personalInfo: {
        fullName: 'Sok Dara',
        email: 'sok@example.com',
        profilePicture: 'data:image/original',
      },
      experience: [],
      skills: [],
      education: '',
    } as any;
    const result = await service.buildResume(dto);
    expect(images.optimizeProfilePicture).toHaveBeenCalledWith(
      'data:image/original',
    );
    expect(dto.personalInfo.profilePicture).toBe('data:image/optimized');
    expect(pdf.generate).toHaveBeenCalledWith(
      expect.stringContaining('Sok Dara'),
    );
    expect(result).toEqual(
      expect.objectContaining({
        filename: 'resume.pdf',
        mimeType: 'application/pdf',
        data: Buffer.from('pdf').toString('base64'),
      }),
    );
  });

  it('wraps PDF renderer failures in an RPC exception', async () => {
    pdf.generate.mockRejectedValue(new Error('renderer unavailable'));
    const error = (await service
      .buildResume({
        template: 'classic',
        personalInfo: {
          fullName: 'Sok Dara',
          email: 'sok@example.com',
          phone: '',
          location: '',
        },
        summary: '',
        experience: [],
        skills: [],
        education: '',
        careerScopes: [],
      } as any)
      .catch((caught) => caught)) as RpcException;
    expect(error).toBeInstanceOf(RpcException);
    expect(error.getError()).toBe('renderer unavailable');
  });

  it('generates and trims an AI cover letter', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '  Dear Hiring Team,\nHello  ' } }],
    });
    const result = await service.generateCoverLetter({
      employeeName: 'Sok',
      companyName: 'Apsara',
      openPositions: ['Engineer'],
      employeeSkills: ['TypeScript'],
    } as any);
    expect(result.coverLetter).toBe('Dear Hiring Team,\nHello');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-test' }),
    );
  });

  it('parses optimization JSON and strips inline images from the AI prompt', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              overallFeedback: 'Good',
              suggestedSkills: ['Docker'],
            }),
          },
        },
      ],
    });
    const result = await service.optimizeResume({
      personalInfo: { profilePicture: 'data:image/png;base64,secret' },
    } as any);
    expect(result.overallFeedback).toBe('Good');
    const prompt = mockCreate.mock.calls[0][0].messages[1].content;
    expect(prompt).not.toContain('base64,secret');
  });

  it('escapes cover-letter HTML and creates a safe filename', async () => {
    const result = await service.generateCoverLetterPdf({
      style: 'classic',
      employeeName: 'Sok Dara',
      employeeJob: 'Engineer',
      companyName: 'Apsara & Co.',
      companyIndustry: 'Technology',
      coverLetterText: '<script>alert("x")</script>\n\nThank you',
    } as any);
    const html = pdf.generate.mock.calls[0][0];
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(result.filename).toBe('cover-letter-sok-dara-apsara-co.pdf');
  });

  it('renders interview preparation to a named PDF', async () => {
    const result = await service.generateInterviewPrepPdf({
      interviewTitle: 'Technical Round',
      companyName: 'Apsara Talent',
      companyIndustry: 'Technology',
      questions: [],
    } as any);
    expect(result.filename).toBe('interview-prep-apsara-talent.pdf');
    expect(result.mimeType).toBe('application/pdf');
  });

  it('propagates AI provider failures through RPC boundaries', async () => {
    mockCreate.mockRejectedValue(new Error('OpenAI unavailable'));
    const error = (await service
      .generateCoverLetter({
        employeeName: 'Sok',
        companyName: 'Apsara',
        openPositions: [],
        employeeSkills: [],
      } as any)
      .catch((caught) => caught)) as RpcException;
    expect(error).toBeInstanceOf(RpcException);
    expect(error.getError()).toBe('OpenAI unavailable');
  });

  it('generates resume prose while preserving trusted identity fields', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: 'Experienced backend engineer.',
              experience: [
                {
                  index: 0,
                  description: 'Built reliable services.',
                  achievements: ['Improved quality'],
                },
              ],
              skills: ['Docker'],
              education: 'BSc Computer Science',
            }),
          },
        },
      ],
    });
    const result = await service.generateResume({
      template: 'classic',
      personalInfo: { fullName: 'Sok Dara', email: 'sok@example.com' },
      summary: '',
      experience: [
        {
          company: 'Apsara',
          position: 'Developer',
          startDate: '2024',
          endDate: null,
          description: '',
          achievements: [],
        },
      ],
      skills: ['TypeScript'],
      education: '',
    } as any);
    expect(result.personalInfo.fullName).toBe('Sok Dara');
    expect(result.summary).toBe('Experienced backend engineer.');
    expect(result.skills).toEqual(
      expect.arrayContaining(['TypeScript', 'Docker']),
    );
    expect(result.design).toBeDefined();
  });

  it('rejects empty AI resume responses', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: ' ' } }] });
    const error = (await service
      .generateResume({
        template: 'classic',
        personalInfo: { fullName: 'Sok', email: 'sok@example.com' },
        experience: [],
        skills: [],
        education: '',
      } as any)
      .catch((value) => value)) as RpcException;
    expect(error.getError()).toBe('AI returned an empty resume');
  });

  it('imports a structured resume from pasted text', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              personalInfo: { fullName: 'Sok Dara', email: 'sok@example.com' },
              summary: 'Backend engineer',
              experience: [],
              skills: ['TypeScript'],
              education: 'RUPP',
              careerScopes: ['Software'],
            }),
          },
        },
      ],
    });
    const result = await service.generateResumeFromText({
      sourceText: 'Sok Dara, backend engineer with TypeScript experience',
      template: 'modern',
    } as any);
    expect(result.personalInfo).toEqual(
      expect.objectContaining({
        fullName: 'Sok Dara',
        email: 'sok@example.com',
      }),
    );
    expect(result.template).toBe('modern');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: expect.objectContaining({ type: 'json_schema' }),
      }),
    );
  });

  it('maps AI text-import refusals to a stable RPC error', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { refusal: 'policy' } }],
    });
    const error = (await service
      .generateResumeFromText({
        sourceText: 'text',
        template: 'classic',
      } as any)
      .catch((value) => value)) as RpcException;
    expect(error.getError()).toBe('AI could not process this text');
  });

  it('polishes and trims an existing cover letter', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        { message: { content: '  Polished cover letter\nSecond paragraph  ' } },
      ],
    });
    await expect(
      service.polishCoverLetter({ coverLetterText: 'Original letter' }),
    ).resolves.toEqual(
      expect.objectContaining({
        coverLetter: 'Polished cover letter\nSecond paragraph',
      }),
    );
  });

  it('returns safe empty optimization fields for an empty provider payload', async () => {
    mockCreate.mockResolvedValue({ choices: [] });
    await expect(service.optimizeResume({} as any)).resolves.toEqual(
      expect.objectContaining({
        overallFeedback: '',
        suggestedSummary: '',
        experienceSuggestions: [],
        suggestedSkills: [],
      }),
    );
  });

  it('returns empty text when cover-letter providers omit content', async () => {
    mockCreate.mockResolvedValueOnce({ choices: [] }).mockResolvedValueOnce({
      choices: [{ message: {} }],
    });
    await expect(
      service.generateCoverLetter({
        employeeName: 'Sok',
        companyName: 'Apsara',
        openPositions: [],
        employeeSkills: [],
      } as any),
    ).resolves.toEqual(expect.objectContaining({ coverLetter: '' }));
    await expect(
      service.polishCoverLetter({ coverLetterText: 'Original' }),
    ).resolves.toEqual(expect.objectContaining({ coverLetter: '' }));
  });

  it.each([
    ['generateResume', 'Failed to generate resume with AI'],
    ['generateResumeFromText', 'Failed to generate resume from pasted text'],
    ['buildResume', 'Resume generation failed'],
    ['optimizeResume', 'Resume optimization failed'],
    ['generateCoverLetter', 'Cover letter generation failed'],
    ['polishCoverLetter', 'Cover letter polish failed'],
  ])(
    'uses the fallback message for non-Error %s failures',
    async (method, message) => {
      if (method === 'buildResume') {
        pdf.generate.mockRejectedValueOnce('offline');
      } else {
        mockCreate.mockRejectedValueOnce('offline');
      }
      const args: Record<string, any> = {
        generateResume: {
          template: 'classic',
          personalInfo: { fullName: 'Sok', email: 'sok@example.com' },
          experience: [],
          skills: [],
          education: '',
        },
        generateResumeFromText: { sourceText: 'Sok', template: 'classic' },
        buildResume: {
          template: 'classic',
          personalInfo: { fullName: 'Sok', email: 'sok@example.com' },
        },
        optimizeResume: {},
        generateCoverLetter: {
          employeeName: 'Sok',
          companyName: 'Apsara',
          openPositions: [],
          employeeSkills: [],
        },
        polishCoverLetter: { coverLetterText: 'Original' },
      };
      const error = (await (service as any)
        [method](args[method])
        .catch((caught) => caught)) as RpcException;
      expect(error.getError()).toBe(message);
    },
  );

  it.each([
    ['generateCoverLetterPdf', 'Cover letter PDF generation failed'],
    ['generateInterviewPrepPdf', 'Interview prep PDF generation failed'],
  ])(
    'uses the PDF fallback for non-Error %s failures',
    async (method, message) => {
      pdf.generate.mockRejectedValueOnce('offline');
      const dto =
        method === 'generateCoverLetterPdf'
          ? {
              style: 'classic',
              employeeName: 'Sok',
              employeeJob: 'Engineer',
              companyName: 'Apsara',
              companyIndustry: 'Tech',
              coverLetterText: 'Hello',
            }
          : {
              interviewTitle: 'Interview',
              companyName: 'Apsara',
              companyIndustry: 'Tech',
              questions: [],
            };
      const error = (await (service as any)
        [method](dto)
        .catch((caught) => caught)) as RpcException;
      expect(error.getError()).toBe(message);
    },
  );

  it('rejects missing content from a text-import response', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: {} }] });

    const error = (await service
      .generateResumeFromText({
        sourceText: 'Sok Dara',
        template: 'classic',
      } as any)
      .catch((caught) => caught)) as RpcException;

    expect(error.getError()).toBe('AI returned an empty imported resume');
  });

  it('routes every AI workflow to its own task tier', async () => {
    config.get.mockReturnValue(undefined);
    mockCreate
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({}) } }],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                personalInfo: { fullName: 'Sok' },
                experience: [],
                skills: [],
              }),
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({}) } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Cover letter' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Polished letter' } }],
      });

    await service.generateResume({
      template: 'classic',
      personalInfo: { fullName: 'Sok', email: 'sok@example.com' },
      experience: [],
      skills: [],
      education: '',
    } as any);
    await service.generateResumeFromText({
      sourceText: 'Sok Dara',
      template: 'classic',
    } as any);
    await service.optimizeResume({} as any);
    await service.generateCoverLetter({
      employeeName: 'Sok',
      companyName: 'Apsara',
      openPositions: [],
      employeeSkills: [],
    } as any);
    await service.polishCoverLetter({ coverLetterText: 'Original' });

    expect(mockCreate).toHaveBeenCalledTimes(5);
    // Each workflow names itself, so AI_TASK_TIER can put the resume documents
    // on the expensive model and the cover-letter work on the cheap one
    // without any of these call sites changing again.
    expect(aiClient.forTask.mock.calls.flat()).toEqual([
      'resumeGenerate',
      'resumeImport',
      'resumeOptimize',
      'coverLetterDraft',
      'coverLetterPolish',
    ]);
    for (const [request] of mockCreate.mock.calls) {
      expect(request.model).toBe('gpt-test');
    }
  });
});
