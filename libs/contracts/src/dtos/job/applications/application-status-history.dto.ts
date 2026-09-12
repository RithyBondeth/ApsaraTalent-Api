import { EApplicationStatus } from '@app/common/database/enums/application-status.enum';

export class ApplicationStatusHistoryEntryDTO {
  id: string;
  applicationId: string;
  from: EApplicationStatus | null;
  to: EApplicationStatus;
  note: string | null;
  createdAt: Date;
  actorId: string | null;
  actorName: string | null;

  constructor(partial: Partial<ApplicationStatusHistoryEntryDTO>) {
    Object.assign(this, partial);
  }
}
