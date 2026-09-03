import { EOutboxChannel } from '../database/enums/outbox-channel.enum';
import { EmailService } from './email.service';

describe('EmailService', () => {
  const enqueue = jest.fn();
  const send = jest.fn();
  const logger = { setContext: jest.fn(), warn: jest.fn(), error: jest.fn() };

  const createService = () =>
    new EmailService({ enqueue } as any, { send } as any, logger as any);

  beforeEach(() => {
    jest.clearAllMocks();
    enqueue.mockResolvedValue('outbox-1');
    send.mockResolvedValue({ messageId: 'email-1' });
  });

  it('records the send in the outbox instead of calling SMTP', async () => {
    const result = await createService().sendEmail({
      to: 'person@example.com',
      subject: 'Welcome',
      text: 'Hello',
    });

    expect(enqueue).toHaveBeenCalledWith(
      EOutboxChannel.EMAIL,
      expect.objectContaining({ to: 'person@example.com', subject: 'Welcome' }),
      {},
    );
    expect(send).not.toHaveBeenCalled();
    expect(result).toEqual({ queued: true, id: 'outbox-1' });
  });

  it('rejects a missing recipient before writing a row that could never succeed', async () => {
    await expect(
      createService().sendEmail({ subject: 'Invalid' } as any),
    ).rejects.toThrow('Recipient email is required');
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('falls back to an inline send when the outbox cannot accept the message', async () => {
    enqueue.mockResolvedValue(null);

    const result = await createService().sendEmail({
      to: 'person@example.com',
      subject: 'Welcome',
      text: 'Hello',
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'person@example.com' }),
    );
    expect(result).toEqual({ queued: false, id: null });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('propagates an SMTP failure taken on the fallback path', async () => {
    enqueue.mockResolvedValue(null);
    send.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(
      createService().sendEmail({
        to: 'person@example.com',
        subject: 'Welcome',
        text: 'Hello',
      }),
    ).rejects.toThrow('SMTP unavailable');
  });
});
