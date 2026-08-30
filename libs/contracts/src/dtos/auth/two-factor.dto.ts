import {
  IsNotEmpty,
  IsNumberString,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { CoreResponseDTO } from '../shared/core-response.dto';
import { UserResponseDTO } from '../shared/user.dto';

export class TwoFactorSetupDTO {
  @IsUUID()
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
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsNumberString({ no_symbols: true })
  @Length(6, 6)
  otp: string;
}

export class TwoFactorEnableResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<TwoFactorEnableResponseDTO>) {
    super(partial);
  }
}

export class TwoFactorDisableDTO {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsNumberString({ no_symbols: true })
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
  twoFactorToken: string;

  @IsNumberString({ no_symbols: true })
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
