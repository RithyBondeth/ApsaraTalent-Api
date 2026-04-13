import { IsNotEmpty, IsString } from 'class-validator';
import { ForgotPasswordResponseDTO } from './forgot-password.dto';

export class VerifyEmailDTO {
  @IsString()
  @IsNotEmpty()
  emailVerificationToken: string;
}

export class VerifyEmailResponseDTO extends ForgotPasswordResponseDTO {}
