import { IsNotEmpty, IsString } from 'class-validator';
import { CoreResponseDTO } from '../shared/core-response.dto';

export class VerifyKhqrDTO {
  @IsString()
  @IsNotEmpty()
  qrString: string;
}

export class VerifyKhqrResponseValidDTO extends CoreResponseDTO {
  success: true;
  isValid: true;
  /** Raw decoded QR data returned by the Bakong library. */
  qrData: Record<string, unknown>;

  constructor(partial: Partial<VerifyKhqrResponseValidDTO>) {
    super(partial);
  }
}

export class VerifyKhqrResponseInvalidDTO extends CoreResponseDTO {
  success: false;
  isValid: false;

  constructor(partial: Partial<VerifyKhqrResponseInvalidDTO>) {
    super(partial);
  }
}

export type VerifyKhqrResponseDTO =
  | VerifyKhqrResponseValidDTO
  | VerifyKhqrResponseInvalidDTO;
