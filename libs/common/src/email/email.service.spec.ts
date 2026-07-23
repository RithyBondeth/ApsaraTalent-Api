import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('EmailService', () => {
  const sendMail = jest.fn();
  const config = {
    get: jest.fn(
      (key: string) =>
        ({
          'email.host': 'smtp.example.com',
          'email.port': 587,
          'email.user': 'user',
          'email.password': 'password',
          'email.from': 'noreply@example.com',
        })[key],
    ),
  };
  const logger = { info: jest.fn(), error: jest.fn() };

  async function createService() {
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    const service = new EmailService(config as any, logger as any);
    await new Promise((resolve) => setImmediate(resolve));
    return service;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue({ messageId: 'email-1' });
  });

  it('initializes SMTP from application configuration', async () => {
    await createService();
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'user', pass: 'password' },
      }),
    );
  });

  it('uses the configured sender when none is provided', async () => {
    const service = await createService();
    await service.sendEmail({
      to: 'person@example.com',
      subject: 'Welcome',
      text: 'Hello',
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: 'person@example.com',
      }),
    );
  });

  it('preserves an explicitly supplied sender', async () => {
    const service = await createService();
    await service.sendEmail({
      from: 'company@example.com',
      to: 'person@example.com',
      subject: 'Match',
      text: 'Matched',
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'company@example.com' }),
    );
  });

  it('rejects missing recipients before calling SMTP', async () => {
    const service = await createService();
    await expect(
      service.sendEmail({ subject: 'Invalid' } as any),
    ).rejects.toThrow('Recipient email is required');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('propagates a stable SMTP failure', async () => {
    const service = await createService();
    sendMail.mockRejectedValue(new Error('SMTP unavailable'));
    await expect(
      service.sendEmail({
        to: 'person@example.com',
        subject: 'Hello',
        text: 'Hello',
      }),
    ).rejects.toThrow('SMTP unavailable');
  });
});
