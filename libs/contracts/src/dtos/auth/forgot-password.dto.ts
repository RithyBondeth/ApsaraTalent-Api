import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDTO {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

export class ForgotPasswordResponseDTO {
  message: string;

  constructor(partial: Partial<ForgotPasswordResponseDTO>) {
    return Object.assign(this, partial);
  }
}
