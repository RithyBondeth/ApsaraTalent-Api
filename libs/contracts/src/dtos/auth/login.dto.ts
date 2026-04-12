import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDTO {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
