import { IsOptional, IsString } from 'class-validator';

export class FacebookAuthDTO {
  @IsString()
  @IsOptional()
  id: string;

  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  firstname: string;

  @IsString()
  @IsOptional()
  lastname: string;

  @IsString()
  @IsOptional()
  picture: string;

  @IsString()
  @IsOptional()
  provider: string;
}
