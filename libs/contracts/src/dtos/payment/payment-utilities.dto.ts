import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

// ─── QR Image ────────────────────────────────────────────────────────────────

export class GenerateQrImageDTO {
  @IsString()
  @IsNotEmpty()
  qrString: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  margin?: number;
}

export class GenerateQrImageQueryDTO {
  @IsOptional()
  @IsIn(['base64', 'url'])
  format?: 'base64' | 'url';
}

export class QrImageResponseDTO {
  image: string;
  format: 'base64' | 'url';

  constructor(partial: Partial<QrImageResponseDTO>) {
    Object.assign(this, partial);
  }
}

// ─── MD5 Hash ────────────────────────────────────────────────────────────────

export class GenerateMd5HashDTO {
  @IsString()
  @IsNotEmpty()
  data: string;
}

export class Md5HashResponseDTO {
  md5Hash: string;

  constructor(partial: Partial<Md5HashResponseDTO>) {
    Object.assign(this, partial);
  }
}

// ─── Payment Info Lookup ──────────────────────────────────────────────────────

export class PaymentInfoLookupDTO {
  @IsString()
  @IsNotEmpty()
  md5Hash: string;
}

/** Raw passthrough response from the Bakong payment-info endpoint. */
export class PaymentInfoResponseDTO {
  [key: string]: any;

  constructor(partial: Partial<PaymentInfoResponseDTO>) {
    Object.assign(this, partial);
  }
}

// ─── KHQR Info Lookup ────────────────────────────────────────────────────────

export class KhqrInfoLookupDTO {
  @IsString()
  @IsNotEmpty()
  qrString: string;
}

/** Raw passthrough response from the Bakong KHQR-info endpoint. */
export class KhqrInfoResponseDTO {
  [key: string]: any;

  constructor(partial: Partial<KhqrInfoResponseDTO>) {
    Object.assign(this, partial);
  }
}
