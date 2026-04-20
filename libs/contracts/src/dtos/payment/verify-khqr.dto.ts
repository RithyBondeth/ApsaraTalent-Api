import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyKhqrDTO {
  @IsString()
  @IsNotEmpty()
  qrString: string;
}

export class VerifyKhqrResponseValidDTO {
  success: true;
  isValid: true;
  /** Raw decoded QR data returned by the Bakong library. */
  qrData: Record<string, unknown>;
  message: string;

  constructor(partial: Partial<VerifyKhqrResponseValidDTO>) {
    Object.assign(this, partial);
  }
}

export class VerifyKhqrResponseInvalidDTO {
  success: false;
  isValid: false;
  message: string;

  constructor(partial: Partial<VerifyKhqrResponseInvalidDTO>) {
    Object.assign(this, partial);
  }
}

export type VerifyKhqrResponseDTO =
  | VerifyKhqrResponseValidDTO
  | VerifyKhqrResponseInvalidDTO;
