import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export class GenerateDeepLinkDTO {
  @IsString()
  @IsNotEmpty()
  qrString: string;

  @IsUrl({}, { message: 'Callback must be a valid URL' })
  callback: string;

  @IsOptional()
  @IsUrl({}, { message: 'App icon URL must be a valid URL' })
  appIconUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 25, { message: 'App name must be between 1 and 25 characters' })
  appName?: string;
}
