export class UploadAttachmentResponseDTO {
  url: string;
  type: 'image' | 'document' | 'audio';
  filename: string;
  size: number;

  constructor(partial: Partial<UploadAttachmentResponseDTO>) {
    Object.assign(this, partial);
  }
}
