import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LoginResponseDTO } from './login.dto';

export class RefreshTokenDTO {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  constructor(partial: Partial<RefreshTokenDTO>) {
    Object.assign(this, partial);
  }
}

/**
 * The body of `POST /auth/refresh`, for clients that cannot use the cookie.
 *
 * Browsers present the refresh token as the httpOnly `refresh-token` cookie and
 * send no body. A native client has no cookie jar the CSRF check will accept:
 * a cookie-carrying write with no `Origin` or `Sec-Fetch-Site` is refused on
 * purpose (see `isCsrfSafeRequest`), and that check tells non-browser clients
 * to present credentials some other way. This is that other way. A token in
 * the body cannot be forged cross-site — the attacking page would have to know
 * it — so it needs no origin check.
 */
export class RefreshTokenRequestDTO {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}

export class RefreshTokenResponseDTO extends LoginResponseDTO {
  constructor(partial: Partial<RefreshTokenResponseDTO>) {
    super(partial);
  }
}
