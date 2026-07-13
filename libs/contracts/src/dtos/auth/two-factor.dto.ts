import { IsNotEmpty, IsString, Length } from 'class-validator';
import { CoreResponseDTO } from '../shared/core-response.dto';
import { UserResponseDTO } from '../shared/user.dto';

export class TwoFactorSetupDTO {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class TwoFactorSetupResponseDTO extends CoreResponseDTO {
  qrCodeUrl: string;
  secret: string;

  constructor(partial: Partial<TwoFactorSetupResponseDTO>) {
    super(partial);
  }
}

export class TwoFactorEnableDTO {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}

export class TwoFactorEnableResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<TwoFactorEnableResponseDTO>) {
    super(partial);
  }
}

export class TwoFactorDisableDTO {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}

export class TwoFactorDisableResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<TwoFactorDisableResponseDTO>) {
    super(partial);
  }
}

export class TwoFactorVerifyLoginDTO {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}

export class TwoFactorVerifyLoginResponseDTO extends CoreResponseDTO {
  accessToken?: string;
  refreshToken?: string;
  user: UserResponseDTO;

  constructor(partial: Partial<TwoFactorVerifyLoginResponseDTO>) {
    super(partial);
  }
}
