import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  CreateInterviewDTO,
  CreateInterviewResponseDTO,
  GetInterviewResponseDTO,
  GetInterviewsByCompanyDTO,
  GetInterviewsByEmployeeDTO,
  UpdateInterviewStatusResponseDTO,
  UpdateInterviewStatusDTO,
} from '@app/contracts/dtos/job';
import {
  I_INTERVIEW_SERVICE,
  IInterviewService,
} from '@app/contracts/interfaces/service/job-service.interface';
import { IInterviewRpcController } from '@app/contracts/interfaces/controller/job-controllers/interview-controller.interface';

@Controller()
export class InterviewController implements IInterviewRpcController {
  constructor(
    @Inject(I_INTERVIEW_SERVICE)
    private readonly interviewService: IInterviewService,
  ) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.CREATE_INTERVIEW)
  async createInterview(
    @Payload() createInterviewDTO: CreateInterviewDTO,
  ): Promise<CreateInterviewResponseDTO> {
    return this.interviewService.createInterview(createInterviewDTO);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_INTERVIEWS_BY_EMPLOYEE)
  async getInterviewsByEmployee(
    @Payload() getInterviewsByEmployeeDTO: GetInterviewsByEmployeeDTO,
  ): Promise<GetInterviewResponseDTO[]> {
    return this.interviewService.getInterviewsByEmployee(
      getInterviewsByEmployeeDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_INTERVIEWS_BY_COMPANY)
  async getInterviewsByCompany(
    @Payload() getInterviewsByCompanyDTO: GetInterviewsByCompanyDTO,
  ): Promise<GetInterviewResponseDTO[]> {
    return this.interviewService.getInterviewsByCompany(
      getInterviewsByCompanyDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.UPDATE_INTERVIEW_STATUS)
  async updateInterviewStatus(
    @Payload() updateInterviewDTO: UpdateInterviewStatusDTO,
  ): Promise<UpdateInterviewStatusResponseDTO> {
    return this.interviewService.updateInterviewStatus(updateInterviewDTO);
  }
}
