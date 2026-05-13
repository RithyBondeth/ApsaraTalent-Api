export class MatchAnalyticsItemDTO {
  id: string;
  name: string;
  avatar: string | null;
  matchedAt: Date;

  constructor(partial: Partial<MatchAnalyticsItemDTO>) {
    Object.assign(this, partial);
  }
}

export class WeeklyActivityItemDTO {
  day: string;
  likes: number;
  received: number;
  matches: number;

  constructor(partial: Partial<WeeklyActivityItemDTO>) {
    Object.assign(this, partial);
  }
}

export class MonthlyActivityItemDTO {
  /** ISO year-month label, e.g. "2025-01" */
  month: string;
  likes: number;
  received: number;
  matches: number;

  constructor(partial: Partial<MonthlyActivityItemDTO>) {
    Object.assign(this, partial);
  }
}

export class AnalyticsResponseDTO {
  totalLikesGiven: number;
  totalLikesReceived: number;
  totalMatches: number;
  matchRate: number;
  weeklyActivity: WeeklyActivityItemDTO[];
  monthlyActivity: MonthlyActivityItemDTO[];
  totalFavorites: number;
  recentMatches: MatchAnalyticsItemDTO[];

  constructor(partial: Partial<AnalyticsResponseDTO>) {
    Object.assign(this, partial);
  }
}
