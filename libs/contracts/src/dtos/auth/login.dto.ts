import { IsNotEmpty, IsString } from 'class-validator';
import { UserResponseDTO } from '../user/user-response.dto';

export class LoginDTO {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LoginResponseDTO {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: UserResponseDTO;

  constructor(partial: Partial<LoginResponseDTO>) {
    return Object.assign(this, partial);
  }
}
