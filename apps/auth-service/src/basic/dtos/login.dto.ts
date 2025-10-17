import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class LoginDTO {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsStrongPassword()
  @IsNotEmpty()
  password: string;
}
