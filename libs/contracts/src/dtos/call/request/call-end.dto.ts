import { IsOptional, IsString, IsUUID } from 'class-validator';

/** WebSocket event: call-end — sent by either party */
export class CallEndDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  targetUserId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  constructor(partial: Partial<CallEndDTO>) {
    Object.assign(this, partial);
  }
}
