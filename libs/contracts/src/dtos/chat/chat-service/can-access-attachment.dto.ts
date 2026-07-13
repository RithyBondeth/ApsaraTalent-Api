import { IsBoolean, IsString, IsUUID } from 'class-validator';

export class CanAccessAttachmentDTO {
  @IsUUID()
  userId: string;

  @IsString()
  attachment: string;
}

export class CanAccessAttachmentResponseDTO {
  @IsBoolean()
  canAccess: boolean;

  constructor(partial: Partial<CanAccessAttachmentResponseDTO>) {
    Object.assign(this, partial);
  }
}
