import { LoginResponseDTO } from './login.dto';
import { UserResponseDTO } from '../shared/user.dto';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyOtpDTO {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class VerifyOtpResponseDTO extends LoginResponseDTO {
  isSuccess: boolean;

  constructor(partial: Partial<VerifyOtpResponseDTO>) {
    super(partial);
  }
}
