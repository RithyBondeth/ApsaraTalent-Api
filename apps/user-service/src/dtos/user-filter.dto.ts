import { IsOptional, IsString } from 'class-validator';

export class UserFilterDTO {
  @IsString()
  @IsOptional()
  scope: string;
}
