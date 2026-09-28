import { IsNotEmpty, IsString, Length } from 'class-validator';

export class DeviceTokenBodyDTO {
  @IsString()
  @IsNotEmpty()
  @Length(20, 4096)
  token: string;
}

export class DeviceTokenDTO extends DeviceTokenBodyDTO {
  userId: string;

  constructor(partial: Partial<DeviceTokenDTO>) {
    super();
    Object.assign(this, partial);
  }
}

export class DeviceTokenResponseDTO {
  success: boolean;

  constructor(partial: Partial<DeviceTokenResponseDTO>) {
    Object.assign(this, partial);
  }
}
