
export class LivenessResponseDTO {
  status: string;
  service: string;
  uptime: number;
  timestamp: string;

  constructor(partial: Partial<LivenessResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class HealthDTO {}
