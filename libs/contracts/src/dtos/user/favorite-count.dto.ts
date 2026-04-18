import { IsOptional, IsString } from 'class-validator';
export class FavoriteCountResponseDTO {
  count: number;
}

export class FavoriteCountDTO {
  @IsString() @IsOptional() eid?: string;
  @IsString() @IsOptional() cid?: string;
}
