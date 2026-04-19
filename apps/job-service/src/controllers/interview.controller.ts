import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  CreateInterviewDTO,
  GetInterviewsByCompanyDTO,
  GetInterviewsByEmployeeDTO,
  UpdateInterviewStatusDTO,
} from '@app/contracts/dtos/job';
import { InterviewResponseDTO } from '@app/contracts/dtos/job';
import {
  I_INTERVIEW_SERVICE,
  IInterviewService,
} from '@app/contracts/interfaces/service/job-service.interface';

@Controller()
export class InterviewController {
  constructor(
    @Inject(I_INTERVIEW_SERVICE)
    private readonly interviewService: IInterviewService,
  ) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.CREATE_INTERVIEW)
  async createInterview(
    @Payload() creteInterviewDTO: CreateInterviewDTO,
  ): Promise<InterviewResponseDTO> {
    return this.interviewService.createInterview(creteInterviewDTO);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_INTERVIEWS_BY_EMPLOYEE)
  async getInterviewsByEmployee(
    @Payload() payload: GetInterviewsByEmployeeDTO,
  ): Promise<InterviewResponseDTO[]> {
    return this.interviewService.getInterviewsByEmployee(payload);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_INTERVIEWS_BY_COMPANY)
  async getInterviewsByCompany(
    @Payload() payload: GetInterviewsByCompanyDTO,
  ): Promise<InterviewResponseDTO[]> {
    return this.interviewService.getInterviewsByCompany(payload);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.UPDATE_INTERVIEW_STATUS)
  async updateInterviewStatus(
    @Payload() updateInterviewDTO: UpdateInterviewStatusDTO,
  ): Promise<InterviewResponseDTO> {
    return this.interviewService.updateInterviewStatus(updateInterviewDTO);
  }
}
