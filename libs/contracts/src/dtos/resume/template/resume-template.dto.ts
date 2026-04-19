export class ResumeTemplateResponseDTO {
  id: string;
  title: string;
  description: string;
  image: string | null;
  price: number | null;
  isPremium: boolean;
  createdAt: Date;

  constructor(partial: Partial<ResumeTemplateResponseDTO>) {
    Object.assign(this, partial);
  }
}
