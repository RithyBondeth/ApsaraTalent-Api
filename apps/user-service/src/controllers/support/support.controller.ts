import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  ReportProblemDTO,
  ReportProblemResponseDTO,
} from '@app/contracts/dtos/user';
import { ISupportRpcController } from '@app/contracts/interfaces/controller/user-controllers/support-controller.interface';
import * as userServiceInterface from '@app/contracts/interfaces/service/user-service.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class SupportController implements ISupportRpcController {
  constructor(
    @Inject(userServiceInterface.I_SUPPORT_SERVICE)
    private readonly supportService: userServiceInterface.ISupportService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.REPORT_PROBLEM)
  async reportProblem(
    @Payload() reportProblemDTO: ReportProblemDTO,
  ): Promise<ReportProblemResponseDTO> {
    return this.supportService.reportProblem(reportProblemDTO);
  }
}
