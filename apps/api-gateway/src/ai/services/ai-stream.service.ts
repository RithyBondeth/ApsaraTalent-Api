import { AiClientService } from '@app/common/ai/ai-client.service';
import { TAiTask } from '@app/contracts/interfaces/domain/ai-model.interface';
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Response } from 'express';
import { IAiStreamService } from '@app/contracts';
import { Logger } from '@nestjs/common';

@Injectable()
export class AiStreamService implements IAiStreamService {
  private readonly logger = new Logger(AiStreamService.name);

  constructor(private readonly aiClient: AiClientService) {}

  /**
   * Write SSE headers and stream a chat completion to the HTTP response.
   *
   * `task` picks the model: the cheap tier for short, constrained work, the
   * expensive one for the resume documents. See AI_TASK_TIER.
   */
  async pipe(
    task: TAiTask,
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: number,
    res: Response,
    maxTokens = 2_048,
  ): Promise<void> {
    const { client, model } = this.aiClient.forTask(task);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

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

      for await (const chunk of stream) {
        if (clientClosed) break;
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) {
          res.write(`data: ${JSON.stringify({ t: 'chunk', v: text })}\n\n`);
        }
      }

      if (!clientClosed) {
        res.write(`data: ${JSON.stringify({ t: 'done' })}\n\n`);
      }
    } catch (err: unknown) {
      if (!clientClosed) {
        this.logger.error('[OpenAI Stream Error]', err);
        const message = err instanceof Error ? err.message : 'Stream failed';
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ t: 'error', v: message })}\n\n`);
        }
      }
    } finally {
      res.off('close', handleClose);
      if (!res.writableEnded) res.end();
    }
  }
}
