import { IsNotEmpty, IsString } from 'class-validator';
import { ForgotPasswordResponseDTO } from './forgot-password.dto';

export class LoginOtpDTO {
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class LoginOtpResponseDTO extends ForgotPasswordResponseDTO {
  constructor(partial: Partial<LoginOtpResponseDTO>) {
    super(partial);
  }
}
