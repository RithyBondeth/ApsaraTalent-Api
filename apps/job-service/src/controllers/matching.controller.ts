import { IMatchingController } from '@app/contracts/interfaces/job-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserResponseDTO } from 'apps/user-service/src/dtos/user-response.dto';
import { JOB_SERVICE } from '@app/contracts/constants/job-service.constant';
import { MatchDto } from '../dtos/match.dto';
import { MatchingService } from '../services/matching.service';

import {
  I_MATCHING_SERVICE,
  IMatchingService,
} from '@app/contracts/interfaces/job-service.interface';

@Controller()
export class MatchingController implements IMatchingController {
  constructor(
    @Inject(I_MATCHING_SERVICE)
    private readonly matchingService: IMatchingService,
  ) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.EMPLOYEE_LIKES)
  async employeeLikes(@Payload() payload: MatchDto): Promise<any> {
    return this.matchingService.employeeLikes(payload);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.COMPANY_LIKES)
  async companyLikes(@Payload() payload: MatchDto): Promise<any> {
    return this.matchingService.companyLikes(payload);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_LIKED)
  async findCurrentEmployeeLiked(
    @Payload() payload: { eid: string },
  ): Promise<UserResponseDTO[]> {
    return this.matchingService.findCurrentEmployeeLiked(payload.eid);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_LIKED)
  async findCurrentCompanyLiked(
    @Payload() payload: { cid: string },
  ): Promise<UserResponseDTO[]> {
    return this.matchingService.findCurrentCompanyLiked(payload.cid);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING)
  async findCurrentEmployeeMatching(
    @Payload() payload: { eid: string },
  ): Promise<any> {
    return this.matchingService.findCurrentEmployeeMatching(payload.eid);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING)
  async findCurrentCompanyMatching(
    @Payload() payload: { cid: string },
  ): Promise<any> {
    return this.matchingService.findCurrentCompanyMatching(payload.cid);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING_COUNT)
  async findCurrentEmployeeMatchingCount(
    @Payload() payload: { eid: string },
  ): Promise<any> {
    return this.matchingService.findCurrentEmployeeMatchingCount(payload.eid);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING_COUNT)
  async findCurrentCompanyMatchingCount(
    @Payload() payload: { cid: string },
  ): Promise<any> {
    return this.matchingService.findCurrentCompanyMatchingCount(payload.cid);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_ANALYTICS)
  async getAnalytics(@Payload() payload: { userId: string; role: string }) {
    return this.matchingService.getAnalytics(
      payload.userId,
      payload.role as 'employee' | 'company',
    );
  }
}
