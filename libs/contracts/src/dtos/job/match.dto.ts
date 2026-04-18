import { IsNotEmpty, IsString } from 'class-validator';

export class MatchDTO {
  @IsString() @IsNotEmpty() eid: string;
  @IsString() @IsNotEmpty() cid: string;
}
