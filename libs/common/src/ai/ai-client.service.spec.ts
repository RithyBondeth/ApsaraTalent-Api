import OpenAI from 'openai';
import { AiClientService } from './ai-client.service';

jest.mock('openai', () => jest.fn().mockImplementation((opts) => ({ opts })));

describe('AiClientService', () => {
  const tiers = {
    quality: { apiKey: 'quality-key', baseUrl: undefined, model: 'gpt-4o' },
    fast: {
      apiKey: 'fast-key',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile',
    },
  };

  const configFor = (values: Record<string, unknown>) => ({
    get: jest.fn((key: string) => values[key]),
  });

  const fullConfig = () =>
    configFor({
      'openai.tiers.quality': tiers.quality,
      'openai.tiers.fast': tiers.fast,
      'openai.apiKey': 'legacy-key',
      'openai.model': 'gpt-4o',
    });

  beforeEach(() => jest.clearAllMocks());

  it('builds one client per tier, not one per request', () => {
    const service = new AiClientService(fullConfig() as any);
    expect(OpenAI).toHaveBeenCalledTimes(2);

    const first = service.forTier('fast');
    const second = service.forTier('fast');
    expect(first.client).toBe(second.client);
    expect(OpenAI).toHaveBeenCalledTimes(2);
  });

  it('passes each tier its own key and base URL', () => {
    new AiClientService(fullConfig() as any);
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: 'quality-key',
      baseURL: undefined,
    });
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: 'fast-key',
      baseURL: 'https://api.groq.com/openai/v1',
    });
  });

  it('sends the resume documents to the quality tier', () => {
    const service = new AiClientService(fullConfig() as any);
    for (const task of [
      'resumeGenerate',
      'resumeImport',
      'resumeOptimize',
    ] as const) {
      expect(service.forTask(task).model).toBe('gpt-4o');
    }
  });

  it('sends the short, constrained tasks to the fast tier', () => {
    const service = new AiClientService(fullConfig() as any);
    for (const task of [
      'profileRefine',
      'coverLetterDraft',
      'coverLetterPolish',
      'matchExplanation',
      'interviewPrep',
      'skillGap',
      'resumeParse',
    ] as const) {
      expect(service.forTask(task).model).toBe('llama-3.3-70b-versatile');
    }
  });

  it('falls back to the legacy single-model settings when tiers are absent', () => {
    // An older .env has no OPENAI_FAST_* block. The platform should degrade to
    // one model rather than fail to boot.
    const service = new AiClientService(
      configFor({
        'openai.apiKey': 'legacy-key',
        'openai.model': 'gpt-4o-legacy',
      }) as any,
    );
    expect(service.forTask('profileRefine').model).toBe('gpt-4o-legacy');
    expect(service.forTask('resumeGenerate').model).toBe('gpt-4o-legacy');
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: 'legacy-key',
      baseURL: undefined,
    });
  });

  it('falls back to gpt-4o when nothing is configured at all', () => {
    const service = new AiClientService(configFor({}) as any);
    expect(service.forTask('resumeGenerate').model).toBe('gpt-4o');
  });
});
