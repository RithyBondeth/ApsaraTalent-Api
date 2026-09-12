import { EApplicationStatus } from '@app/common/database/enums/application-status.enum';
import { GetApplicationResponseDTO } from './get-application.dto';

export class PipelineColumnDTO {
  status: EApplicationStatus;
  count: number;
  applications: GetApplicationResponseDTO[];

  constructor(partial: Partial<PipelineColumnDTO>) {
    Object.assign(this, partial);
  }
}

/**
 * A kanban read for one job: applications bucketed by stage, ready to render.
 * WITHDRAWN and the legacy REVIEWED are omitted from the columns array — the
 * board is about the live pipeline. A row that lands in either after the read
 * disappears from the board on the next fetch, which is the intended behavior.
 */
export class JobPipelineResponseDTO {
  jobId: string;
  jobTitle: string;
  columns: PipelineColumnDTO[];
  totalCount: number;

  constructor(partial: Partial<JobPipelineResponseDTO>) {
    Object.assign(this, partial);
  }
}
