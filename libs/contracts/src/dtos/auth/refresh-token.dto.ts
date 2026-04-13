import { IsNotEmpty, IsString } from 'class-validator';
import { LoginResponseDTO } from './login.dto';

export class RefreshTokenDTO {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class RefreshTokenResponseDTO extends LoginResponseDTO {}
