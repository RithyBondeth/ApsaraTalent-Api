import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  CreateInterviewDto,
  UpdateInterviewStatusDto,
} from '../dtos/interview.dto';

import { IInterviewController } from '@app/contracts/interfaces/controller/job-controller.interface';

import {
  I_INTERVIEW_SERVICE,
  IInterviewService,
} from '@app/contracts/interfaces/service/job-service.interface';

@Controller()
export class InterviewController implements IInterviewController {
  constructor(
    @Inject(I_INTERVIEW_SERVICE)
    private readonly interviewService: IInterviewService,
  ) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.CREATE_INTERVIEW)
  async createInterview(@Payload() dto: CreateInterviewDto) {
    return this.interviewService.createInterview(dto);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_INTERVIEWS_BY_EMPLOYEE)
  async getInterviewsByEmployee(@Payload() payload: { employeeId: string }) {
    return this.interviewService.getInterviewsByEmployee(payload.employeeId);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_INTERVIEWS_BY_COMPANY)
  async getInterviewsByCompany(@Payload() payload: { companyId: string }) {
    return this.interviewService.getInterviewsByCompany(payload.companyId);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.UPDATE_INTERVIEW_STATUS)
  async updateInterviewStatus(@Payload() dto: UpdateInterviewStatusDto) {
    return this.interviewService.updateInterviewStatus(dto);
  }
}
