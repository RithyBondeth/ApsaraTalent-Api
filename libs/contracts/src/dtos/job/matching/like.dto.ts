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
  /** User IDs who received a notification from this action — used by api-gateway to emit socket badge increments */
  notificationTargets?: string[];

  constructor(partial: Partial<MatchResponseDTO>) {
    Object.assign(this, partial);
  }
}
