import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Response } from 'express';

@Injectable()
export class AiStreamService {
  private readonly openai: OpenAI;
  readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({ apiKey: config.get<string>('openai.apiKey') });
    this.model = config.get<string>('openai.model') ?? 'gpt-4o';
  }

  /** Set standard SSE response headers and flush. */
  setSseHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

  /**
   * Async generator that yields raw text chunks from an OpenAI chat completion stream.
   * Useful for controllers that need to process chunks before writing to the response.
   */
  async *rawStream(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: number,
  ): AsyncGenerator<string, void, unknown> {
    const stream = await this.openai.chat.completions.create({
      model: this.model,
      temperature,
      stream: true,
      messages,
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) yield text;
    }
  }

  /** Write SSE headers and stream an OpenAI chat completion to the HTTP response. */
  async pipe(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: number,
    res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx proxy buffering
    res.flushHeaders();

    try {
      const stream = await this.openai.chat.completions.create({
        model: this.model,
        temperature,
        stream: true,
        messages,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) {
          res.write(`data: ${JSON.stringify({ t: 'chunk', v: text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ t: 'done' })}\n\n`);
    } catch (err: any) {
      res.write(
        `data: ${JSON.stringify({ t: 'error', v: err?.message ?? 'Stream failed' })}\n\n`,
      );
    } finally {
      res.end();
    }
  }
}
