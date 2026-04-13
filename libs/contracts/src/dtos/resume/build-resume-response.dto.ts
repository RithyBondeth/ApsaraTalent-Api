export class BuildResumeResponseDTO {
  filename: string;
  mimeType: string;
  /** Base64-encoded PDF content */
  data: string;
}
