import { IsNotEmpty, IsString } from 'class-validator';

export class LoginOtpDTO {
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class LoginOtpResponseDTO {
  message: string;
  isSuccess: boolean;

  constructor(partial: Partial<LoginOtpResponseDTO>) {
    Object.assign(this, partial);
  }
}
