import { IsOptional, IsUUID } from 'class-validator';

export class FavoriteCountDTO {
  @IsUUID()
  @IsOptional()
  eid?: string;

  @IsUUID()
  @IsOptional()
  cid?: string;
}
export class FavoriteCountResponseDTO {
  count: number;

  constructor(partial: Partial<FavoriteCountResponseDTO>) {
    Object.assign(this, partial);
  }
}
