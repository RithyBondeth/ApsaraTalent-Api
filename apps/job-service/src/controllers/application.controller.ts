import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  ApplyJobDTO,
  ApplicationResponseDTO,
  UpdateApplicationStatusDTO,
} from '@app/contracts/dtos/job';
import { IApplicationRpcController } from '@app/contracts/interfaces/controller/application-controller.interface';
import { I_APPLICATION_SERVICE, IApplicationService } from '@app/contracts';

@Controller()
export class ApplicationController implements IApplicationRpcController {
  constructor(
    @Inject(I_APPLICATION_SERVICE)
    private readonly applicationService: IApplicationService,
  ) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.APPLY_JOB)
  applyJob(
    @Payload() payload: { employeeId: string; applyJobDTO: ApplyJobDTO },
  ): Promise<ApplicationResponseDTO> {
    return this.applicationService.applyJob(
      payload.employeeId,
      payload.applyJobDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_MY_APPLICATIONS)
  getMyApplications(
    @Payload() payload: { employeeId: string },
  ): Promise<ApplicationResponseDTO[]> {
    return this.applicationService.getMyApplications(payload.employeeId);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_JOB_APPLICATIONS)
  getJobApplications(
    @Payload() payload: { jobId: string; companyId: string },
  ): Promise<ApplicationResponseDTO[]> {
    return this.applicationService.getJobApplications(
      payload.jobId,
      payload.companyId,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.UPDATE_APPLICATION_STATUS)
  updateApplicationStatus(
    @Payload()
    payload: {
      companyId: string;
      updateApplicationStatusDTO: UpdateApplicationStatusDTO;
    },
  ): Promise<ApplicationResponseDTO> {
    return this.applicationService.updateApplicationStatus(
      payload.companyId,
      payload.updateApplicationStatusDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.WITHDRAW_APPLICATION)
  withdrawApplication(
    @Payload() payload: { employeeId: string; applicationId: string },
  ): Promise<{ message: string }> {
    return this.applicationService.withdrawApplication(
      payload.employeeId,
      payload.applicationId,
    );
  }
}
