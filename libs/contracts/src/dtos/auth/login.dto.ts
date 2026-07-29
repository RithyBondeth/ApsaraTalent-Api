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
  // `null` is meaningful here and distinct from absent: the social login flows
  // return it to say "authenticated, but no tokens yet — this is a new user
  // who still has to pick a role". Typing it as optional-only forced those
  // call sites to lie about what they send over the wire.
  accessToken?: string | null;
  refreshToken?: string | null;
  user?: UserResponseDTO;
  requiresTwoFactor?: boolean;
  userId?: string;

  constructor(partial: Partial<LoginResponseDTO>) {
    super(partial);
  }
}
