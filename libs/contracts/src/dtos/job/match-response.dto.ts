export class MatchResponseDTO {
  id: string;
  employeeLiked: boolean;
  companyLiked: boolean;
  isMatched: boolean;
  createdAt: Date;
}

export class MatchCountResponseDTO {
  count: number;
}
