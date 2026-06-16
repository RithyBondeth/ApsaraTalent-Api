import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

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

  // The requesting user's User.id — when present, results hide profiles blocked
  // in either direction between the viewer and the candidate.
  @IsOptional()
  @IsUUID()
  requesterId?: string;
}
