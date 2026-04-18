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
}

export class VerifyKhqrResponseInvalidDTO {
  success: false;
  isValid: false;
  message: string;
}

export type VerifyKhqrResponseDTO =
  | VerifyKhqrResponseValidDTO
  | VerifyKhqrResponseInvalidDTO;