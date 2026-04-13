import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDTO {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

export class ForgotPasswordResponseDTO {
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
