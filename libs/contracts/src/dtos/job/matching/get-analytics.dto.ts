export class MatchAnalyticsItemDTO {
  id: string;
  name: string;
  avatar: string | null;
  matchedAt: Date;

  constructor(partial: Partial<MatchAnalyticsItemDTO>) {
    return Object.assign(this, partial);
  }
}

export class WeeklyActivityItemDTO {
  day: string;
  likes: number;
  received: number;
  matches: number;

  constructor(partial: Partial<WeeklyActivityItemDTO>) {
    return Object.assign(this, partial);
  }
}

export class GetAnalyticsResponseDTO {
  totalLikesGiven: number;
  totalLikesReceived: number;
  totalMatches: number;
  matchRate: number;
  weeklyActivity: WeeklyActivityItemDTO[];
  totalFavorites: number;
  recentMatches: MatchAnalyticsItemDTO[];

  constructor(partial: Partial<GetAnalyticsResponseDTO>) {
    return Object.assign(this, partial);
  }
}
