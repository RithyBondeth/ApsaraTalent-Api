import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class PaginationDTO {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  skip?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;
}
