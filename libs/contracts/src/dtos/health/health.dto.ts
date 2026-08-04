export class LivenessResponseDTO {
  status: string;
  service: string;
  release: string;
  uptime: number;
  timestamp: string;

  constructor(partial: Partial<LivenessResponseDTO>) {
    Object.assign(this, partial);
  }
}
