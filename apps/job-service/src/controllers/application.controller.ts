import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { IApplicationRpcController } from '@app/contracts/interfaces/controller/job-controllers/application-controller.interface';
import {
  ApplyApplicationDTO,
  ApplyApplicationResponseDTO,
  GetApplicationResponseDTO,
  I_APPLICATION_SERVICE,
  IApplicationService,
  UpdateApplicationStatusDTO,
  UpdateApplicationStatusResponseDTO,
} from '@app/contracts';

@Controller()
export class ApplicationController implements IApplicationRpcController {
  constructor(
    @Inject(I_APPLICATION_SERVICE)
    private readonly applicationService: IApplicationService,
  ) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.APPLY_JOB)
  applyApplication(
    @Payload()
    payload: {
      employeeId: string;
      applyApplicationDTO: ApplyApplicationDTO;
    },
  ): Promise<ApplyApplicationResponseDTO> {
    return this.applicationService.applyApplication(
      payload.employeeId,
      payload.applyApplicationDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_MY_APPLICATIONS)
  getMyApplications(
    @Payload() payload: { employeeId: string },
  ): Promise<GetApplicationResponseDTO[]> {
    return this.applicationService.getMyApplications(payload.employeeId);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_JOB_APPLICATIONS)
  getJobApplications(
    @Payload() payload: { jobId: string; companyId: string },
  ): Promise<GetApplicationResponseDTO[]> {
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
  ): Promise<UpdateApplicationStatusResponseDTO> {
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
