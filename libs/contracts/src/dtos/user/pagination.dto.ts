import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

/** Pagination DTO used at the HTTP layer — enforces Min constraints. */
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

/**
 * Pagination DTO used inside microservice RPC payloads.
 * No @Min validators — validation happens at the HTTP layer before
 * the payload reaches the microservice.
 */
export class UserPaginationDTO {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  skip: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit: number;
}
