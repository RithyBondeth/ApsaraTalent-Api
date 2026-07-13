import { IsNotEmpty, IsString } from 'class-validator';
import { LoginResponseDTO } from './login.dto';

export class RefreshTokenDTO {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  constructor(partial: Partial<RefreshTokenDTO>) {
    Object.assign(this, partial);
  }
}

export class RefreshTokenResponseDTO extends LoginResponseDTO {
  constructor(partial: Partial<RefreshTokenResponseDTO>) {
    super(partial);
  }
}
