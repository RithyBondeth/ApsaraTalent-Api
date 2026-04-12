import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export enum Currency {
  KHR = 'KHR',
  USD = 'USD',
}

export class GenerateIndividualKhqrDTO {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/, {
    message: 'Invalid Bakong account ID format. Should be like: username@bank',
  })
  bakongAccountId: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 25, {
    message: 'Merchant name must be between 1 and 25 characters',
  })
  merchantName: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 15, {
    message: 'Merchant city must be between 1 and 15 characters',
  })
  merchantCity: string;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must be a valid number with max 2 decimal places' },
  )
  @Min(0, { message: 'Amount cannot be negative' })
  @Transform(({ value }) => parseFloat(value))
  amount?: number;

  @IsOptional()
  @IsEnum(Currency, { message: 'Currency must be either KHR or USD' })
  currency?: Currency;

  @IsOptional()
  @IsString()
  @Length(1, 25, { message: 'Bill number must be between 1 and 25 characters' })
  billNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]+$/, { message: 'Invalid mobile number format' })
  @Length(8, 15, {
    message: 'Mobile number must be between 8 and 15 characters',
  })
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  @Length(1, 25, { message: 'Store label must be between 1 and 25 characters' })
  storeLabel?: string;

  @IsOptional()
  @IsString()
  @Length(1, 25, {
    message: 'Terminal label must be between 1 and 25 characters',
  })
  terminalLabel?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Expiration minutes must be a valid number' })
  @Min(1, { message: 'Expiration must be at least 1 minute' })
  @Max(10080, { message: 'Expiration cannot exceed 7 days (10080 minutes)' })
  expirationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isStatic?: boolean;
}
