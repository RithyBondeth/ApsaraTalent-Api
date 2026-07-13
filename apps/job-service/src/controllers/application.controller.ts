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
    @Payload('employeeId') employeeId: string,
    @Payload('applyApplicationDTO') applyApplicationDTO: ApplyApplicationDTO,
  ): Promise<ApplyApplicationResponseDTO> {
    return this.applicationService.applyApplication(
      employeeId,
      applyApplicationDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_MY_APPLICATIONS)
  getMyApplications(
    @Payload('employeeId') employeeId: string,
  ): Promise<GetApplicationResponseDTO[]> {
    return this.applicationService.getMyApplications(employeeId);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_JOB_APPLICATIONS)
  getJobApplications(
    @Payload('jobId') jobId: string,
    @Payload('companyId') companyId: string,
  ): Promise<GetApplicationResponseDTO[]> {
    return this.applicationService.getJobApplications(jobId, companyId);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.UPDATE_APPLICATION_STATUS)
  updateApplicationStatus(
    @Payload('companyId') companyId: string,
    @Payload('updateApplicationStatusDTO')
    updateApplicationStatusDTO: UpdateApplicationStatusDTO,
  ): Promise<UpdateApplicationStatusResponseDTO> {
    return this.applicationService.updateApplicationStatus(
      companyId,
      updateApplicationStatusDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.WITHDRAW_APPLICATION)
  withdrawApplication(
    @Payload('employeeId') employeeId: string,
    @Payload('applicationId') applicationId: string,
  ): Promise<{ message: string }> {
    return this.applicationService.withdrawApplication(
      employeeId,
      applicationId,
    );
  }
}
