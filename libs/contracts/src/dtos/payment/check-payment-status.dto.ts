import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { CoreResponseDTO } from '../shared/core-response.dto';

export class CheckPaymentStatusDTO {
  @IsString()
  @IsNotEmpty()
  @Length(32, 32, { message: 'MD5 hash must be exactly 32 characters' })
  @Matches(/^[a-fA-F0-9]{32}$/, {
    message: 'MD5 hash must be a valid hexadecimal string',
  })
  md5Hash: string;
}

export class CheckPaymentStatusPayerInfoDTO {
  name: string | null;
  phone: string | null;
}

export class CheckPaymentStatusFoundResponseDTO extends CoreResponseDTO {
  success: true;
  paymentId: string;
  paymentStatus: string;
  transactionId: string | null;
  amount: number | null;
  currency: string | null;
  paidAt: Date | string | null;
  payerInfo: CheckPaymentStatusPayerInfoDTO | null;

  constructor(partial: Partial<CheckPaymentStatusFoundResponseDTO>) {
    super(partial);
  }
}

export class CheckPaymentStatusNotFoundResponseDTO extends CoreResponseDTO {
  success: false;
  paymentId: string;
  paymentStatus: 'not_found';

  constructor(partial: Partial<CheckPaymentStatusNotFoundResponseDTO>) {
    super(partial);
  }
}

export type CheckPaymentStatusResponseDTO =
  | CheckPaymentStatusFoundResponseDTO
  | CheckPaymentStatusNotFoundResponseDTO;
