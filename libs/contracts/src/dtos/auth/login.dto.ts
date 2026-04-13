import { IsNotEmpty, IsString } from 'class-validator';
import { User } from '@app/common/database/entities/user.entity';

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
  user: User;

  constructor(partial: Partial<LoginResponseDTO>) {
    return Object.assign(this, partial);
  }
}
