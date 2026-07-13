import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';
import { ForgotPasswordResponseDTO } from './forgot-password.dto';

export class ResetPasswordDTO {
  @IsStrongPassword()
  @IsNotEmpty()
  newPassword: string;

  @IsStrongPassword()
  @IsNotEmpty()
  confirmPassword: string;

  @IsString()
  @IsOptional()
  token?: string;
}

export class ResetPasswordResponseDTO extends ForgotPasswordResponseDTO {
  constructor(partial: Partial<ResetPasswordResponseDTO>) {
    super(partial);
  }
}
