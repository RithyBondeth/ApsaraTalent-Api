import { IsOptional, IsString } from 'class-validator';

export class LinkedInAuthDTO {
  @IsString()
  @IsOptional()
  id: string;

  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsString()
  @IsOptional()
  picture: string;

  @IsString()
  @IsOptional()
  provider: string;
}
