import { IsOptional, IsString } from 'class-validator';

export class GithubAuthDTO {
  @IsString()
  @IsOptional()
  id: string;

  @IsString()
  @IsOptional()
  username: string;

  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  picture: string;

  @IsString()
  provider: string;
}
