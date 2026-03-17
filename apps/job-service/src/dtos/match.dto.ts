import { IsNotEmpty, IsString } from 'class-validator';

export class MatchDto {
  @IsString()
  @IsNotEmpty()
  eid: string;

  @IsString()
  @IsNotEmpty()
  cid: string;
}
