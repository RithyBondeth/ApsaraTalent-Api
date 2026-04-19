export class LikeResponseDTO {
  id: string;
  employeeLiked: boolean;
  companyLiked: boolean;
  isMatched: boolean;
  createdAt: Date;

  constructor(partial: Partial<LikeResponseDTO>) {
    return Object.assign(this, partial);
  }
}
