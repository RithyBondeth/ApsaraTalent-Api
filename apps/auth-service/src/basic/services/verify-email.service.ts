import { User } from '@app/common/database/entities/user.entity';
import { EmailService } from '@app/common/email/email.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  ResendEmailOtpDTO,
  ResendEmailOtpResponseDTO,
  VerifyEmailDTO,
  VerifyEmailResponseDTO,
} from '@app/contracts';
import { AUTH } from '@app/contracts/constants/domain/auth.constant';
import { IVerifyEmailService } from '@app/contracts/interfaces/service/auth-service.interface';

/**
 * Email verification by 6-digit code.
 *
 * This replaced a magic link carrying a signed JWT. The link only worked on the
 * device that opened the mail, which is the wrong device whenever someone signs
 * up on a laptop and reads mail on a phone. A code can be carried between them.
 *
 * The trade is that a link is unguessable and six digits are one of a million,
 * so the code is defended on three sides: it expires (10 minutes), it burns
 * after a fixed number of wrong guesses, and the route it arrives on is
 * strict-throttled per IP. Losing any one of those makes this weaker than what
 * it replaced.
 */
@Injectable()
export class VerifyEmailService implements IVerifyEmailService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly logger: PinoLogger,
  ) {}

  /** Six digits, never leading-zero-stripped. */
  static generateOtp(): string {
    return Math.floor(AUTH.OTP_MIN + Math.random() * AUTH.OTP_RANGE).toString();
  }

  async verifyEmail(
    verifyEmailDTO: VerifyEmailDTO,
  ): Promise<VerifyEmailResponseDTO> {
    try {
      const user = await this.userRepository.findOne({
        where: { email: verifyEmailDTO.email },
      });

      // One message for "no such account", "already verified" and "no code
      // outstanding". Distinguishing them would turn this route into an
      // account-existence oracle for anyone who can send requests.
      if (!user || user.isEmailVerified || !user.emailVerificationOtp)
        throw new RpcException({
          message: 'Invalid or expired verification code',
          statusCode: 401,
        });

      if (
        !user.emailVerificationOtpExpires ||
        user.emailVerificationOtpExpires < new Date()
      ) {
        await this.clearOtp(user);
        throw new RpcException({
          message: 'Verification code has expired. Request a new one.',
          statusCode: 401,
        });
      }

      if (user.emailVerificationOtp !== verifyEmailDTO.otp) {
        user.emailVerificationAttempts += 1;

        // Burn the code rather than leaving it live for the next guess.
        if (user.emailVerificationAttempts >= AUTH.EMAIL_OTP_MAX_ATTEMPTS) {
          await this.clearOtp(user);
          throw new RpcException({
            message: 'Too many incorrect attempts. Request a new code.',
            statusCode: 401,
          });
        }

        await this.userRepository.save(user);
        throw new RpcException({
          message: 'Invalid or expired verification code',
          statusCode: 401,
        });
      }

      user.isEmailVerified = true;
      await this.clearOtp(user);

      return new VerifyEmailResponseDTO({
        message: 'Your email was verified successfully. Now you can login',
      });
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'An error occurred while verifying email.',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async resendEmailOtp(
    resendEmailOtpDTO: ResendEmailOtpDTO,
  ): Promise<ResendEmailOtpResponseDTO> {
    try {
      const user = await this.userRepository.findOne({
        where: { email: resendEmailOtpDTO.email },
      });

      // Always the same answer, whether or not the address exists. The caller
      // learns nothing about who is registered; the mail only lands for real,
      // unverified accounts.
      const acknowledgement = new ResendEmailOtpResponseDTO({
        message: `If that address needs verifying, a new code is on its way to ${resendEmailOtpDTO.email}`,
      });

      if (!user || user.isEmailVerified) return acknowledgement;

      const otp = VerifyEmailService.generateOtp();
      user.emailVerificationOtp = otp;
      user.emailVerificationOtpExpires = new Date(
        Date.now() + AUTH.EMAIL_OTP_EXPIRY,
      );
      user.emailVerificationAttempts = 0;
      await this.userRepository.save(user);

      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Apsara Talent - Your verification code',
        text: buildOtpEmail(otp),
      });

      this.logger.debug(
        { email: user.email },
        'Email verification code reissued',
      );

      return acknowledgement;
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'An error occurred while resending code.',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  private async clearOtp(user: User): Promise<void> {
    user.emailVerificationOtp = null;
    user.emailVerificationOtpExpires = null;
    user.emailVerificationAttempts = 0;
    await this.userRepository.save(user);
  }
}

/** Shared so registration and resend cannot drift into two different emails. */
export function buildOtpEmail(otp: string): string {
  const minutes = Math.round(AUTH.EMAIL_OTP_EXPIRY / 60_000);
  return [
    'Welcome to Apsara Talent.',
    '',
    `Your email verification code is: ${otp}`,
    '',
    `The code expires in ${minutes} minutes. If you did not create an account, you can ignore this message.`,
  ].join('\n');
}
