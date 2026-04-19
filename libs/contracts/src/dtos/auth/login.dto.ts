import { IsNotEmpty, IsString } from 'class-validator';
import { UserResponseDTO } from '../shared/user.dto';

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
    Object.assign(this, partial);
  }
}
