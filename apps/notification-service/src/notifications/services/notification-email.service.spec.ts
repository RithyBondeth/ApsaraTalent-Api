import { ENotificationCategory } from '@app/common/database/enums/notification-category.enum';
import { ENotificationChannel } from '@app/common/database/enums/notification-channel.enum';
import { NotificationEmailService } from './notification-email.service';

describe('NotificationEmailService', () => {
  const users = { findOne: jest.fn() };
  const email = { sendEmail: jest.fn() };
  const preferences = {
    canDeliver: jest.fn(),
    unsubscribeTokenFor: jest.fn(),
  };
  const logger = { setContext: jest.fn(), warn: jest.fn() };
  let values: Record<string, unknown>;
  const config = { get: jest.fn((key: string) => values[key]) };

  const createService = () =>
    new NotificationEmailService(
      users as any,
      email as any,
      preferences as any,
      config as any,
      logger as any,
    );

  const input = {
    userId: 'u1',
    title: 'You were shortlisted',
    message: 'Acme moved your application forward.',
    category: ENotificationCategory.APPLICATION,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    values = { 'frontend.origin': 'https://app.example.com' };
    preferences.canDeliver.mockResolvedValue(true);
    preferences.unsubscribeTokenFor.mockResolvedValue('a'.repeat(48));
    users.findOne.mockResolvedValue({ email: 'person@example.com' });
  });

  it('sends a rendered email to the user address', async () => {
    await createService().send(input);

    expect(preferences.canDeliver).toHaveBeenCalledWith({
      userId: 'u1',
      category: ENotificationCategory.APPLICATION,
      channel: ENotificationChannel.EMAIL,
    });
    expect(email.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'person@example.com',
        subject: 'You were shortlisted',
      }),
    );
  });

  it('carries RFC 8058 one-click unsubscribe headers', async () => {
    await createService().send(input);

    const [options] = email.sendEmail.mock.calls[0];
    // Without these, "report spam" is the reader's easiest exit — and spam
    // complaints, not unsubscribes, are what damage the sending domain.
    expect(options.headers['List-Unsubscribe']).toBe(
      `<https://app.example.com/unsubscribe?token=${'a'.repeat(48)}>`,
    );
    expect(options.headers['List-Unsubscribe-Post']).toBe(
      'List-Unsubscribe=One-Click',
    );
  });

  it('sends nothing when the user has opted out of this category', async () => {
    preferences.canDeliver.mockResolvedValue(false);

    await createService().send(input);

    expect(email.sendEmail).not.toHaveBeenCalled();
    // No point minting an unsubscribe token for an email that is not going out.
    expect(preferences.unsubscribeTokenFor).not.toHaveBeenCalled();
  });

  it('sends nothing when the user has no address on record', async () => {
    users.findOne.mockResolvedValue({ email: null });

    await createService().send(input);

    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('skips sending entirely when no app origin is configured', async () => {
    values = {};

    await createService().send(input);

    // Every link in the mail would be relative and therefore dead.
    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(preferences.canDeliver).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('ignores wildcard entries when picking the link origin', async () => {
    values = {
      'frontend.origin': 'https://*.netlify.app,https://app.example.com',
    };

    await createService().send(input);

    const [options] = email.sendEmail.mock.calls[0];
    // A wildcard pattern is not a URL anyone can click.
    expect(options.headers['List-Unsubscribe']).toContain(
      'https://app.example.com',
    );
  });
});
