import { IsNotEmpty, IsString } from 'class-validator';
import { UserResponseDTO } from '../shared/user.dto';
import { CoreResponseDTO } from '../shared/core-response.dto';

export class LoginDTO {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LoginResponseDTO extends CoreResponseDTO {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDTO;

  constructor(partial: Partial<LoginResponseDTO>) {
    super(partial);
  }
}
