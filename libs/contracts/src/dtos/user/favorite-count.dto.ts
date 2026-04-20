import { IsOptional, IsUUID } from 'class-validator';

export class FavoriteCountResponseDTO {
  count: number;

  constructor(partial: Partial<FavoriteCountResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class FavoriteCountDTO {
  @IsUUID() @IsOptional() eid?: string;
  @IsUUID() @IsOptional() cid?: string;
}
