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

export class UnMatchResposneDTO extends CoreResponseDTO {
  /**
   * Auth user IDs of both former match participants — populated by the service,
   * not persisted. Socket rooms are keyed by auth user ID (chat.gateway joins
   * `payload.id`), NOT by employee/company profile ID, so the gateway must
   * broadcast to these rather than to the eid/cid it was called with.
   */
  notifyUserIds?: string[];

  constructor(partial: Partial<UnMatchResposneDTO>) {
    super(partial);
  }
}
