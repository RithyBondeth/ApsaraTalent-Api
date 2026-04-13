import { IsNumber, IsString } from 'class-validator';

export class UploadAttachmentResponseDTO {
  @IsString()
  url: string;

  @IsString()
  type: 'image' | 'document' | 'audio';

  @IsString()
  filename: string;

  @IsNumber()
  size: number;

  constructor(partial: Partial<UploadAttachmentResponseDTO>) {
    Object.assign(this, partial);
  }
}
