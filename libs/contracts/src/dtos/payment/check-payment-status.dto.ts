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
