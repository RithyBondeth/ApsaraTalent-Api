import {
  ArrayMaxSize,
  IsArray,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CheckPaymentBulkStatusDTO {
  @IsArray()
  @ArrayMaxSize(50, { message: 'Maximum 50 MD5 hashes allowed per request' })
  @IsString({ each: true })
  @Length(32, 32, {
    each: true,
    message: 'Each MD5 hash must be exactly 32 characters',
  })
  @Matches(/^[a-fA-F0-9]{32}$/, {
    each: true,
    message: 'Each MD5 hash must be a valid hexadecimal string',
  })
  md5Hashes: string[];
}
