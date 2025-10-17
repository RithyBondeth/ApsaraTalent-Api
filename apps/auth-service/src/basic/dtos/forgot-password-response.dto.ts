import { IsString } from 'class-validator';

export class ForgotPasswordResponseDTO {
  @IsString()
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
