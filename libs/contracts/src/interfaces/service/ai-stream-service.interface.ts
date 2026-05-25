import OpenAI from 'openai';
import { Response } from 'express';

export interface IAiStreamService {
  setSseHeaders(res: Response): void;

  rawStream(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: number,
  ): AsyncGenerator<string, void, unknown>;

  pipe(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: number,
    res: Response,
  ): Promise<void>;
}
