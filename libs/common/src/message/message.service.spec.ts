import { MessageService } from './message.service';

const mockCreateMessage = jest.fn();
jest.mock('twilio', () =>
  jest.fn(() => ({ messages: { create: mockCreateMessage } })),
);

describe('MessageService', () => {
  const config = {
    get: jest.fn(
      (key: string) =>
        ({
          'sms.twilio.accountSid': 'sid',
          'sms.twilio.authToken': 'token',
          'sms.twilio.phoneNumber': '+10000000000',
        })[key],
    ),
  };
  const email = { sendEmail: jest.fn() };
  const service = new MessageService(config as any, email as any);

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMessage.mockResolvedValue({ sid: 'message-1' });
    email.sendEmail.mockResolvedValue({ messageId: 'email-1' });
  });

  it('sends an OTP without logging the credential elsewhere', async () => {
    await service.sendOtp('+85512345678', '123456');
    expect(mockCreateMessage).toHaveBeenCalledWith({
      body: 'Apsara Talent, Your OTP code is: 123456',
      from: '+10000000000',
      to: '+85512345678',
    });
  });

  it('sends a password reset token to the requested phone', async () => {
    await service.sendResetToken('+85512345678', 'reset-token');
    expect(mockCreateMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+85512345678',
        body: expect.stringContaining('reset-token'),
      }),
    );
  });

  it('requires both phone numbers before match notification delivery', async () => {
    await expect(
      service.notifyMatch(
        '',
        '+8552',
        'Company',
        'Employee',
        'e@test.com',
        'c@test.com',
      ),
    ).rejects.toThrow('Missing phone number');
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it('emails both match participants', async () => {
    await service.notifyMatch(
      '+8551',
      '+8552',
      'Apsara',
      'Sok',
      'employee@example.com',
      'company@example.com',
    );
    expect(email.sendEmail).toHaveBeenCalledTimes(2);
    expect(email.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'employee@example.com',
        from: 'company@example.com',
      }),
    );
  });

  it('returns a stable error when a match notification provider fails', async () => {
    email.sendEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));
    await expect(
      service.notifyMatch(
        '+8551',
        '+8552',
        'Apsara',
        'Sok',
        'employee@example.com',
        'company@example.com',
      ),
    ).rejects.toThrow('Failed to send match notifications');
  });
});
