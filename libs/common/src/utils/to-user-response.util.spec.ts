import 'reflect-metadata';
import { instanceToPlain } from 'class-transformer';
import { toUserResponseDTO } from './to-user-response.util';

const CREDENTIAL_FIELDS = [
  'password',
  'otpCode',
  'otpCodeExpires',
  'twoFactorSecret',
  'resetPasswordToken',
  'resetPasswordExpires',
  'refreshToken',
  'emailVerificationToken',
  'pushNotificationToken',
  'facebookId',
  'googleId',
  'linkedinId',
  'githubId',
];

const fullEntity: any = {
  id: 'u1',
  role: 'employee',
  email: 'person@example.com',
  phone: '+85512345678',
  profileCompleted: true,
  isEmailVerified: true,
  isTwoFactorEnabled: false,
  createdAt: new Date('2026-01-01'),
  password: '$2b$10$bcrypt.hash.value',
  otpCode: '123456',
  otpCodeExpires: new Date('2026-01-02'),
  twoFactorSecret: 'TOTPSECRET',
  resetPasswordToken: 'reset-token',
  resetPasswordExpires: new Date('2026-01-03'),
  refreshToken: 'refresh-digest',
  emailVerificationToken: 'verify-token',
  pushNotificationToken: 'fcm-token',
  facebookId: 'fb',
  googleId: 'goog',
  linkedinId: 'li',
  githubId: 'gh',
};

describe('toUserResponseDTO', () => {
  it('carries the fields a client legitimately needs', () => {
    const dto = toUserResponseDTO(fullEntity) as any;

    expect(dto.id).toBe('u1');
    expect(dto.role).toBe('employee');
    expect(dto.email).toBe('person@example.com');
    expect(dto.phone).toBe('+85512345678');
    expect(dto.isEmailVerified).toBe(true);
  });

  it.each(CREDENTIAL_FIELDS)('never carries %s', (field) => {
    expect(field in (toUserResponseDTO(fullEntity) as any)).toBe(false);
  });

  it('keeps secrets out after the RPC hop, where @Exclude() cannot run', () => {
    // This is the regression under test. UserResponseDTO marks these fields
    // @Exclude(), but a microservice response is JSON.stringify-ed onto the
    // TCP transport, so the gateway receives a plain object and the decorator
    // never executes. Spreading the entity leaked all of these to clients.
    const overRpc = JSON.parse(JSON.stringify(toUserResponseDTO(fullEntity)));
    const serialized = instanceToPlain(overRpc) as Record<string, unknown>;

    for (const field of CREDENTIAL_FIELDS) {
      expect(serialized).not.toHaveProperty(field);
    }
    expect(serialized.id).toBe('u1');
  });

  it('does not let overrides re-introduce a dropped field', () => {
    const dto = toUserResponseDTO(fullEntity, {
      employee: undefined,
      company: undefined,
    }) as any;

    expect('password' in dto).toBe(false);
    expect(dto.employee).toBeUndefined();
    expect(dto.company).toBeUndefined();
  });

  it('tolerates a missing user without throwing', () => {
    expect(() => toUserResponseDTO(null)).not.toThrow();
    expect(() => toUserResponseDTO(undefined)).not.toThrow();
  });
});
