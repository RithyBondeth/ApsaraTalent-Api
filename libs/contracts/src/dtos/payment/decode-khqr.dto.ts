import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CoreResponseDTO } from '../shared/core-response.dto';

export class DecodeKhqrDTO {
  @IsString()
  @IsNotEmpty()
  qrString: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeRaw?: boolean;
}

export class DecodeKhqrDecodedDataDTO {
  merchantName: string | null;
  merchantCity: string | null;
  amount: number | null;
  currency: string | null;
  bakongAccountId: string | null;
  billNumber: string | null;
  mobileNumber: string | null;
  storeLabel: string | null;
  terminalLabel: string | null;
}

export class DecodeKhqrResponseDTO extends CoreResponseDTO {
  success: true;
  decodedData: DecodeKhqrDecodedDataDTO;

  constructor(partial: Partial<DecodeKhqrResponseDTO>) {
    super(partial);
  }
}
