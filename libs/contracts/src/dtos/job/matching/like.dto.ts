import { IsNotEmpty, IsString } from 'class-validator';

export class MatchDTO {
  @IsString()
  @IsNotEmpty()
  eid: string;

  @IsString()
  @IsNotEmpty()
  cid: string;
}

export class MatchResponseDTO {
  id: string;
  employeeLiked: boolean;
  companyLiked: boolean;
  isMatched: boolean;
  createdAt: Date;

  constructor(partial: Partial<MatchResponseDTO>) {
    Object.assign(this, partial);
  }
}
