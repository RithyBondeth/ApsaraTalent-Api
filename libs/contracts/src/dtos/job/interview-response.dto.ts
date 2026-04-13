export class InterviewResponseDTO {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  location: string | null;
  meetingLink: string | null;
  status: string;
  createdBy: string | null;
  employee: any;
  company: any;
  createdAt: Date;
  updatedAt: Date;
}
