export class MatchAnalyticsItemDTO {
  id: string;
  name: string;
  avatar: string | null;
  matchedAt: Date;
}

export class AnalyticsResponseDTO {
  totalLikesGiven: number;
  totalLikesReceived: number;
  totalMatches: number;
  matchRate: number;
  totalFavorites: number;
  recentMatches: MatchAnalyticsItemDTO[];
}
