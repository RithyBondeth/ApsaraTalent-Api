import { EOutboxChannel } from '../../database/enums/outbox-channel.enum';

/** Per-message overrides taken at enqueue time. */
export interface IOutboxEnqueueOptions {
  /** How many delivery attempts this message gets. Defaults to `outbox.maxAttempts`. */
  maxAttempts?: number;
  /** Hold the message back until this moment — a scheduled send. */
  availableAt?: Date;
}

export interface IOutboxDispatcher {
  readonly channel: EOutboxChannel;
  dispatch(payload: Record<string, unknown>): Promise<void>;
}
