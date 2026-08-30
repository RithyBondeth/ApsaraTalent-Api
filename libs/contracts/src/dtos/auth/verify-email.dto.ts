import { IsEmail, IsNotEmpty, IsNumberString, Length } from 'class-validator';
import { ForgotPasswordResponseDTO } from './forgot-password.dto';

/**
 * Email verification by 6-digit code.
 *
 * The code alone is not enough to identify the account: six digits collide
 * across a large user table, so the email scopes the lookup. It also means an
 * attacker has to know the address they are attacking rather than sweeping for
 * any code that happens to be live.
 */
export class VerifyEmailDTO {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNumberString({ no_symbols: true })
  @Length(6, 6)
  otp: string;
}

export class VerifyEmailResponseDTO extends ForgotPasswordResponseDTO {
  constructor(partial: Partial<VerifyEmailResponseDTO>) {
    super(partial);
  }
}

/** Issue a fresh code, invalidating whatever was outstanding. */
export class ResendEmailOtpDTO {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResendEmailOtpResponseDTO extends ForgotPasswordResponseDTO {
  constructor(partial: Partial<ResendEmailOtpResponseDTO>) {
    super(partial);
  }
}
