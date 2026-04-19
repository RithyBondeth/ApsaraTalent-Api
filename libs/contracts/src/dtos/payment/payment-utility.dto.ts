import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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

export class GenerateMd5HashDTO {
  @IsString()
  @IsNotEmpty()
  data: string;
}

export class PaymentInfoLookupDTO {
  @IsString()
  @IsNotEmpty()
  md5Hash: string;
}

export class KhqrInfoLookupDTO {
  @IsString()
  @IsNotEmpty()
  qrString: string;
}
