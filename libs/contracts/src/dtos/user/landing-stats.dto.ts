export class LandingStatsResponseDTO {
  users: number;
  companies: number;
  employees: number;

  constructor(partial: Partial<LandingStatsResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class LandingStatsDTO {}
