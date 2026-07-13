import { IsString, IsNotEmpty } from 'class-validator';
import { CoreResponseDTO } from '../../shared';

export class UnMatchDTO {
  @IsString()
  @IsNotEmpty()
  eid: string;

  @IsString()
  @IsNotEmpty()
  cid: string;
}

export class UnMatchResposneDTO extends CoreResponseDTO {}
