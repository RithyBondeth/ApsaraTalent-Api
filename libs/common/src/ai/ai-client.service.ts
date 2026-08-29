import {
  AI_TASK_TIER,
  TAiModelTier,
  TAiTask,
} from '@app/contracts/interfaces/domain/ai-model.interface';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/** A tier's resolved provider settings. */
interface IAiTierConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

/** What a call site needs to issue a completion: the client and its model. */
export interface IAiEndpoint {
  client: OpenAI;
  model: string;
}

/**
 * Resolves the client and model for an AI task.
 *
 * Every service used to build its own `new OpenAI({ apiKey })` and read one
 * global `OPENAI_MODEL`, which meant a job-title generator ("return 2-5 words")
 * ran on the same model as full resume generation — there was a single knob for
 * nine features. Tasks now name themselves and get the tier AI_TASK_TIER
 * assigns them.
 *
 * Clients are built once per tier and reused: constructing one per request
 * throws away the SDK's connection pooling for no benefit.
 */
@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly endpoints: Record<TAiModelTier, IAiEndpoint>;

  constructor(private readonly configService: ConfigService) {
    this.endpoints = {
      quality: this.buildEndpoint('quality'),
      fast: this.buildEndpoint('fast'),
    };

    const { fast, quality } = this.endpoints;
    this.logger.log(
      `AI tiers resolved — quality: ${quality.model}, fast: ${fast.model}`,
    );
  }

  /** The endpoint for a task, per the AI_TASK_TIER policy table. */
  forTask(task: TAiTask): IAiEndpoint {
    return this.endpoints[AI_TASK_TIER[task]];
  }

  /** The endpoint for a tier directly, when the caller already knows it. */
  forTier(tier: TAiModelTier): IAiEndpoint {
    return this.endpoints[tier];
  }

  private buildEndpoint(tier: TAiModelTier): IAiEndpoint {
    const config = this.configService.get<IAiTierConfig>(
      `openai.tiers.${tier}`,
    );

    // Fall back to the legacy single-model settings rather than throwing. A
    // missing tier block means an older env file, and the platform should keep
    // working on it — degraded to one model, not broken.
    const apiKey =
      config?.apiKey ?? this.configService.get<string>('openai.apiKey');
    const model =
      config?.model ??
      this.configService.get<string>('openai.model') ??
      'gpt-4o';

    return {
      // `baseURL: undefined` leaves the SDK on api.openai.com. Any
      // OpenAI-compatible host (Groq, Together, Fireworks) works by setting it.
      client: new OpenAI({ apiKey, baseURL: config?.baseUrl }),
      model,
    };
  }
}
