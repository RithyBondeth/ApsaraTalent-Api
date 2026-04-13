import { IsNumber } from 'class-validator';

export class GetUnreadCountResponseDTO {
  @IsNumber()
  count: number;

  constructor(partial: Partial<GetUnreadCountResponseDTO>) {
    Object.assign(this, partial);
  }
}
