import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

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

export class CheckPaymentStatusFoundResponseDTO {
  success: true;
  paymentId: string;
  paymentStatus: string;
  transactionId: string | null;
  amount: number | null;
  currency: string | null;
  paidAt: Date | string | null;
  payerInfo: CheckPaymentStatusPayerInfoDTO | null;
  message: string;

  constructor(partial: Partial<CheckPaymentStatusFoundResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class CheckPaymentStatusNotFoundResponseDTO {
  success: false;
  paymentId: string;
  paymentStatus: 'not_found';
  message: string;

  constructor(partial: Partial<CheckPaymentStatusNotFoundResponseDTO>) {
    Object.assign(this, partial);
  }
}

export type CheckPaymentStatusResponseDTO =
  | CheckPaymentStatusFoundResponseDTO
  | CheckPaymentStatusNotFoundResponseDTO;