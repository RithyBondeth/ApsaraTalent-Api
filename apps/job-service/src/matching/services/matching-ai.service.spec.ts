import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { MatchingAiService } from './matching-ai.service';
import { createMatchingFixtures, expectRpc } from '../matching-test-fixtures';
import { generateMatchingKey } from '@app/common/redis/redis-keys.util';

describe('MatchingAiService', () => {
  const {
    matching,
    employees,
    companies,
    email,
    logger,
    redis,
    config,
    employee,
    company,
  } = createMatchingFixtures();

  // The service asks AiClientService for its endpoint instead of holding its
  // own client, so tests swap `openAI` and the factory hands that back.
  let openAI: any;
  const aiClient = {
    forTask: jest.fn(() => ({ client: openAI, model: 'gpt-test' })),
  };

  const service = new MatchingAiService(
    employees as any,
    companies as any,
    logger as any,
    redis as any,
    config as any,
    aiClient as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    matching.save.mockImplementation(async (value) => ({
      id: 'match-1',
      ...value,
    }));
    email.sendEmail.mockResolvedValue(undefined);
  });

  it('returns normalized profiles for AI matching', async () => {
    employees.findOne.mockResolvedValue({
      ...employee,
      job: 'Engineer',
      educations: [{ degree: 'BSc', school: 'RUPP' }],
      experiences: [{ title: 'Developer' }],
      careerScopes: [{ name: 'Software' }],
    });
    companies.findOne.mockResolvedValue({
      ...company,
      industry: 'Technology',
      careerScopes: [{ name: 'Software' }],
    });

    const result = await service.getAiMatchProfiles({
      eid: 'employee-1',
      cid: 'company-1',
    });
    expect(result.employeeProfile.skills).toEqual(['TypeScript', 'Node.js']);
    expect(result.companyProfile.openPositions[0]).toEqual(
      expect.objectContaining({ skillsRequired: 'TypeScript, PostgreSQL' }),
    );
  });

  it('rejects AI profile generation for missing records', async () => {
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(null);
    await expectRpc(
      service.getAiMatchProfiles({ eid: 'employee-1', cid: 'company-1' }),
      404,
      'Employee or Company not found.',
    );
  });

  it('returns cached AI explanations without loading profiles', async () => {
    const cached = { score: 90, verdict: 'Strong Match' };
    redis.get.mockResolvedValueOnce(cached);
    await expect(
      service.getAiMatchExplanation({ eid: 'employee-1', cid: 'company-1' }),
    ).resolves.toBe(cached);
    expect(employees.findOne).not.toHaveBeenCalled();
  });

  it('generates, normalizes, and caches an AI match explanation', async () => {
    employees.findOne.mockResolvedValue({
      ...employee,
      job: 'Engineer',
      careerScopes: [{ name: 'Software' }],
      educations: [{ degree: 'BSc', school: 'RUPP' }],
      experiences: [{ title: 'Developer' }],
    });
    companies.findOne.mockResolvedValue({
      ...company,
      careerScopes: [{ name: 'Software' }],
      benefits: [],
      values: [],
    });
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              score: 88,
              verdict: 'Strong Match',
              explanation: 'Relevant experience.',
              strengths: ['TypeScript'],
              gaps: ['PostgreSQL'],
            }),
          },
        },
      ],
    });
    openAI = { chat: { completions: { create } } };
    const result = await service.getAiMatchExplanation({
      eid: 'employee-1',
      cid: 'company-1',
    });
    expect(result).toEqual(
      expect.objectContaining({ score: 88, verdict: 'Strong Match' }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ response_format: { type: 'json_object' } }),
    );
    expect(redis.set).toHaveBeenCalled();
  });

  it('generates interview preparation tailored to the requested round', async () => {
    employees.findOne.mockResolvedValue({
      ...employee,
      job: 'Engineer',
      careerScopes: [],
      educations: [],
      experiences: [],
    });
    companies.findOne.mockResolvedValue({
      ...company,
      values: [{ label: 'Growth' }],
      careerScopes: [],
    });
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              questions: [
                {
                  question: 'Explain event loops.',
                  questionKm: 'ពន្យល់ event loop។',
                  category: 'Technical',
                  tip: 'Use an example.',
                  tipKm: 'ប្រើឧទាហរណ៍។',
                },
              ],
            }),
          },
        },
      ],
    });
    openAI = { chat: { completions: { create } } };
    const result = await service.getAiInterviewPrep({
      eid: 'employee-1',
      cid: 'company-1',
      interviewTitle: 'Technical Round',
    });
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]).toEqual(
      expect.objectContaining({ category: 'Technical' }),
    );
    expect(redis.get).toHaveBeenCalledWith(
      generateMatchingKey(
        'ai-interview-prep:employee-1:technical-round',
        'company-1',
      ),
    );
  });

  it('contains missing profiles and malformed AI explanation output', async () => {
    employees.findOne.mockResolvedValueOnce(null);
    companies.findOne.mockResolvedValueOnce(company);
    const missing = await service
      .getAiMatchExplanation({ eid: 'missing', cid: 'company-1' })
      .catch((error) => error as RpcException);
    expect(missing).toBeInstanceOf(RpcException);

    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    openAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'not-json' } }],
          }),
        },
      },
    };
    const malformed = await service
      .getAiMatchExplanation({ eid: 'employee-1', cid: 'company-1' })
      .catch((error) => error as RpcException);
    expect(malformed).toBeInstanceOf(RpcException);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(SyntaxError) }),
      'AI match explanation failed',
    );
  });

  it('contains missing profiles and malformed AI interview-prep output', async () => {
    employees.findOne.mockResolvedValueOnce(employee);
    companies.findOne.mockResolvedValueOnce(null);
    await expect(
      service.getAiInterviewPrep({
        eid: 'employee-1',
        cid: 'missing',
        interviewTitle: 'Round',
      }),
    ).rejects.toBeInstanceOf(RpcException);

    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    openAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: '{broken' } }],
          }),
        },
      },
    };
    await expect(
      service.getAiInterviewPrep({
        eid: 'employee-1',
        cid: 'company-1',
        interviewTitle: 'Round',
      }),
    ).rejects.toBeInstanceOf(RpcException);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(SyntaxError) }),
      'AI interview prep failed',
    );
  });

  it('serializes complete interview-preparation profiles', async () => {
    employees.findOne.mockResolvedValue({
      ...employee,
      job: 'Engineer',
      yearsOfExperience: '4 years',
      description: 'Backend systems',
      careerScopes: [{ name: 'Software' }],
      educations: [{ degree: 'BSc', school: 'RUPP', year: '2024' }],
      experiences: [
        {
          title: 'Developer',
          description: 'Built APIs',
          startDate: '2023',
          endDate: null,
        },
      ],
    });
    companies.findOne.mockResolvedValue({
      ...company,
      industry: 'Technology',
      description: 'Hiring engineers',
      values: [{ label: 'Growth' }],
      careerScopes: [{ name: 'Software' }],
      openPositions: [
        {
          title: 'Backend Engineer',
          skillsRequired: 'TypeScript',
          experienceRequired: '3 years',
          type: 'full-time',
        },
      ],
    });
    const create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ questions: [] }) } }],
    });
    openAI = { chat: { completions: { create } } };
    await service.getAiInterviewPrep({
      eid: 'employee-1',
      cid: 'company-1',
      interviewTitle: 'Technical',
    });
    const prompt = create.mock.calls[0][0].messages[1].content;
    expect(prompt).toContain('RUPP');
    expect(prompt).toContain('Built APIs');
    expect(prompt).toContain('Backend Engineer');
    expect(prompt).toContain('Software');
  });

  it('uses safe defaults for incomplete AI responses', async () => {
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    const create = jest
      .fn()
      .mockResolvedValueOnce({ choices: [] })
      .mockResolvedValueOnce({
        choices: [
          { message: { content: JSON.stringify({ questions: [{}] }) } },
        ],
      });
    openAI = { chat: { completions: { create } } };

    await expect(
      service.getAiMatchExplanation({ eid: 'employee-1', cid: 'company-1' }),
    ).resolves.toEqual(
      expect.objectContaining({
        score: 0,
        verdict: 'Unknown',
        strengths: [],
        gaps: [],
      }),
    );
    await expect(
      service.getAiInterviewPrep({
        eid: 'employee-1',
        cid: 'company-1',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        questions: [
          {
            question: '',
            questionKm: '',
            category: 'General',
            tip: '',
            tipKm: '',
          },
        ],
      }),
    );
  });

  it('uses stable messages for non-Error AI failures', async () => {
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
    openAI = {
      chat: { completions: { create: jest.fn().mockRejectedValue('offline') } },
    };
    const explanation = (await service
      .getAiMatchExplanation({ eid: 'employee-1', cid: 'company-1' })
      .catch((error) => error)) as RpcException;
    expect(explanation.getError()).toBe('AI match explanation failed');

    const prep = (await service
      .getAiInterviewPrep({ eid: 'employee-1', cid: 'company-1' })
      .catch((error) => error)) as RpcException;
    expect(prep.getError()).toBe('AI interview prep failed');
  });

  it('serializes sparse profiles with empty relationship collections', async () => {
    employees.findOne.mockResolvedValue({
      id: 'employee-1',
      skills: null,
      careerScopes: undefined,
      educations: null,
      experiences: undefined,
    });
    companies.findOne.mockResolvedValue({
      id: 'company-1',
      openPositions: null,
      careerScopes: undefined,
      benefits: null,
      values: undefined,
    });

    await expect(
      service.getAiMatchProfiles({
        eid: 'employee-1',
        cid: 'company-1',
      }),
    ).resolves.toEqual({
      employeeProfile: expect.objectContaining({
        skills: [],
        careerScopes: [],
        education: [],
        experience: [],
      }),
      companyProfile: expect.objectContaining({
        openPositions: [],
        careerScopes: [],
      }),
    });
  });

  it('routes each request to its own task tier and tolerates sparse relations', async () => {
    config.get.mockReturnValue(undefined);
    employees.findOne.mockResolvedValue({
      id: 'employee-1',
      skills: null,
      careerScopes: null,
      educations: null,
      experiences: null,
    });
    companies.findOne.mockResolvedValue({
      id: 'company-1',
      openPositions: null,
      careerScopes: null,
      benefits: null,
      values: null,
    });
    const create = jest
      .fn()
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({}) } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ questions: [] }) } }],
      });
    openAI = { chat: { completions: { create } } };

    await service.getAiMatchExplanation({
      eid: 'employee-1',
      cid: 'company-1',
    });
    await service.getAiInterviewPrep({
      eid: 'employee-1',
      cid: 'company-1',
    });

    // The model is no longer read from one global setting — each task asks
    // AI_TASK_TIER which tier it belongs to and uses that endpoint's model.
    expect(aiClient.forTask).toHaveBeenCalledWith('matchExplanation');
    expect(aiClient.forTask).toHaveBeenCalledWith('interviewPrep');
    expect(create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ model: 'gpt-test' }),
    );
    expect(create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ model: 'gpt-test' }),
    );
  });

  it('returns cached interview preparation without loading profiles', async () => {
    const cached = { questions: [{ question: 'Cached question' }] };
    redis.get.mockResolvedValueOnce(cached);

    await expect(
      service.getAiInterviewPrep({
        eid: 'employee-1',
        cid: 'company-1',
        interviewTitle: 'Culture',
      }),
    ).resolves.toBe(cached);
    expect(employees.findOne).not.toHaveBeenCalled();
  });
});
