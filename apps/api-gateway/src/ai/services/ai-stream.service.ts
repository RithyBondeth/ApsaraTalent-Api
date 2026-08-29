import { AiClientService } from '@app/common/ai/ai-client.service';
import { RedisService } from '@app/common/redis/redis.service';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';
import { TAiTask } from '@app/contracts/interfaces/domain/ai-model.interface';
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Response } from 'express';
import { IAiStreamService } from '@app/contracts';
import { Logger } from '@nestjs/common';

@Injectable()
export class AiStreamService implements IAiStreamService {
  private readonly logger = new Logger(AiStreamService.name);

  constructor(
    private readonly aiClient: AiClientService,
    private readonly redisService: RedisService,
  ) {}

  /** Write one SSE frame, if the client is still attached. */
  private send(res: Response, payload: Record<string, unknown>): void {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  /**
   * Write SSE headers and stream a chat completion to the HTTP response.
   *
   * `task` picks the model: the cheap tier for short, constrained work, the
   * expensive one for the resume documents. See AI_TASK_TIER.
   *
   * `cacheKey` opts the route into caching the finished text. Pass it only for
   * output that is a pure function of stored data — the match narration for an
   * employee/company pair — never for anything shaped by free-form user input,
   * where the caller expects a fresh take on each request.
   */
  async pipe(
    task: TAiTask,
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: number,
    res: Response,
    maxTokens = 2_048,
    cacheKey?: string,
  ): Promise<void> {
    const { client, model } = this.aiClient.forTask(task);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // A cached stream replays as a single chunk. The client reads frames, not
    // timings, so it renders the same — it just arrives at once and costs
    // nothing. Only whole successful streams are ever stored, so a hit is
    // always the complete answer.
    if (cacheKey) {
      const cached = await this.redisService
        .get<string>(cacheKey)
        .catch(() => null);
      if (cached) {
        this.send(res, { t: 'chunk', v: cached });
        this.send(res, { t: 'done' });
        res.end();
        return;
      }
    }

    let clientClosed = false;
    const controller = new AbortController();
    const handleClose = () => {
      clientClosed = true;
      controller.abort();
    };
    res.once('close', handleClose);

    try {
      const stream = await client.chat.completions.create(
        {
          model,
          temperature,
          stream: true,
          max_tokens: maxTokens,
          messages,
        },
        { signal: controller.signal },
      );

      let full = '';
      for await (const chunk of stream) {
        if (clientClosed) break;
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) {
          full += text;
          this.send(res, { t: 'chunk', v: text });
        }
      }

      if (!clientClosed) {
        this.send(res, { t: 'done' });

        // Store only a stream that ran to completion. A disconnect leaves
        // `full` truncated mid-sentence, and caching that would serve the
        // fragment to everyone who asks next.
        if (cacheKey && full) {
          void this.redisService
            .set(cacheKey, full, CACHE_TTL.AI)
            .catch((err: Error) =>
              this.logger.warn(`Failed to cache AI stream: ${err.message}`),
            );
        }
      }
    } catch (err: unknown) {
      if (!clientClosed) {
        this.logger.error('[OpenAI Stream Error]', err);
        const message = err instanceof Error ? err.message : 'Stream failed';
        if (!res.writableEnded) {
          this.send(res, { t: 'error', v: message });
        }
      }
    } finally {
      res.off('close', handleClose);
      if (!res.writableEnded) res.end();
    }
  }
}
