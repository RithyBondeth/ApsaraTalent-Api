import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOB_SERVICE } from 'utils/constants/job-service.constant';
import {
  CreateInterviewDto,
  UpdateInterviewStatusDto,
} from '../dtos/interview.dto';
import { InterviewService } from '../services/interview.service';

import { IInterviewController } from '@app/common/interfaces/job-controller.interface';

@Controller()
export class InterviewController implements IInterviewController {
  constructor(private readonly interviewService: InterviewService) {}

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
