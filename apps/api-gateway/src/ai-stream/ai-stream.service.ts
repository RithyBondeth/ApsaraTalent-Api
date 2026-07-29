import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Response } from 'express';
import { IAiStreamService } from '@app/contracts';
import { Logger } from '@nestjs/common';

@Injectable()
export class AiStreamService implements IAiStreamService {
  private readonly openai: OpenAI;
  readonly model: string;
  private readonly logger = new Logger(AiStreamService.name);

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({ apiKey: config.get<string>('openai.apiKey') });
    this.model = config.get<string>('openai.model') ?? 'gpt-4o';
  }

  /** Write SSE headers and stream an OpenAI chat completion to the HTTP response. */
  async pipe(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: number,
    res: Response,
    maxTokens = 2_048,
  ): Promise<void> {
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
      const stream = await this.openai.chat.completions.create(
        {
          model: this.model,
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
