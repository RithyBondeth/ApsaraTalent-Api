import { IsOptional, IsString } from 'class-validator';
export class FavoriteCountResponseDTO {
  count: number;

  constructor(partial: Partial<FavoriteCountResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class FavoriteCountDTO {
  @IsString() @IsOptional() eid?: string;
  @IsString() @IsOptional() cid?: string;
}
