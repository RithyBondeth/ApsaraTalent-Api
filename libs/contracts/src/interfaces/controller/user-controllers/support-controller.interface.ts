import { AuthUser } from '@app/common/decorators/user.decorator';
import {
  ReportProblemBodyDTO,
  ReportProblemDTO,
  ReportProblemResponseDTO,
} from '@app/contracts/dtos/user';

export interface ISupportRpcController {
  reportProblem(
    reportProblemDTO: ReportProblemDTO,
  ): Promise<ReportProblemResponseDTO>;
}

export interface ISupportController {
  reportProblem(
    user: AuthUser,
    body: ReportProblemBodyDTO,
  ): Promise<ReportProblemResponseDTO>;
}
