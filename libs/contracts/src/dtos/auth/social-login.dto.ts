import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { LoginResponseDTO } from './login.dto';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';

export class FacebookAuthDTO {
  @IsString()
  @IsOptional()
  id: string;

  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  firstname: string;

  @IsString()
  @IsOptional()
  lastname: string;

  @IsString()
  @IsOptional()
  picture: string;

  @IsString()
  @IsOptional()
  provider: string;
}

export class GithubAuthDTO {
  @IsString()
  @IsOptional()
  id: string;

  @IsString()
  @IsOptional()
  username: string;

  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  picture: string;

  @IsString()
  provider: string;
}

export class GoogleAuthDTO {
  @IsString()
  id: string;

  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsUrl()
  picture: string;
}

export class LinkedInAuthDTO {
  @IsString()
  @IsOptional()
  id: string;

  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsString()
  @IsOptional()
  picture: string;

  @IsString()
  @IsOptional()
  provider: string;
}

export class SocialLoginResponseDTO extends LoginResponseDTO {
  @IsBoolean()
  @IsOptional()
  newUser?: boolean;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  picture?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsOptional()
  lastLoginMethod?: ELoginMethod;

  @IsOptional()
  lastLoginAt?: Date;

  constructor(partial: Partial<SocialLoginResponseDTO>) {
    super(partial);
  }
}

export class FacebookLoginResponseDTO extends SocialLoginResponseDTO {
  constructor(partial: Partial<FacebookLoginResponseDTO>) {
    super(partial);
  }
}
export class GithubLoginResponseDTO extends SocialLoginResponseDTO {
  constructor(partial: Partial<GithubLoginResponseDTO>) {
    super(partial);
  }
}
export class GoogleLoginResponseDTO extends SocialLoginResponseDTO {
  constructor(partial: Partial<GoogleLoginResponseDTO>) {
    super(partial);
  }
}
export class LinkedInLoginResponseDTO extends SocialLoginResponseDTO {
  constructor(partial: Partial<LinkedInLoginResponseDTO>) {
    super(partial);
  }
}
