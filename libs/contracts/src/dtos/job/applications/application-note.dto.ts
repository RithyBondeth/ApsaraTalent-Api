import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApplicationNoteDTO {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;
}

export class ApplicationNoteResponseDTO {
  id: string;
  applicationId: string;
  body: string;
  createdAt: Date;
  authorId: string | null;
  authorName: string | null;

  constructor(partial: Partial<ApplicationNoteResponseDTO>) {
    Object.assign(this, partial);
  }
}
