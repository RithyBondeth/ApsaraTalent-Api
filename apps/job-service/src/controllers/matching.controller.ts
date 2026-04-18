import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserResponseDTO } from '@app/contracts/dtos/user';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { MatchDto } from '@app/contracts/dtos/job';
import {
  MatchResponseDTO,
  MatchCountResponseDTO,
  AnalyticsResponseDTO,
} from '@app/contracts/dtos/job';
import {
  I_MATCHING_SERVICE,
  IMatchingService,
} from '@app/contracts/interfaces/service/job-service.interface';

@Controller()
export class MatchingController {
  constructor(
    @Inject(I_MATCHING_SERVICE)
    private readonly matchingService: IMatchingService,
  ) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.EMPLOYEE_LIKES)
  async employeeLikes(
    @Payload() matchDTO: MatchDto,
  ): Promise<MatchResponseDTO> {
    return this.matchingService.employeeLikes(matchDTO);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.COMPANY_LIKES)
  async companyLikes(@Payload() matchDTO: MatchDto): Promise<MatchResponseDTO> {
    return this.matchingService.companyLikes(matchDTO);
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
  ): Promise<UserResponseDTO[]> {
    return this.matchingService.findCurrentEmployeeMatching(payload.eid);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING)
  async findCurrentCompanyMatching(
    @Payload() payload: { cid: string },
  ): Promise<UserResponseDTO[]> {
    return this.matchingService.findCurrentCompanyMatching(payload.cid);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING_COUNT)
  async findCurrentEmployeeMatchingCount(
    @Payload() payload: { eid: string },
  ): Promise<MatchCountResponseDTO> {
    return this.matchingService.findCurrentEmployeeMatchingCount(payload.eid);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING_COUNT)
  async findCurrentCompanyMatchingCount(
    @Payload() payload: { cid: string },
  ): Promise<MatchCountResponseDTO> {
    return this.matchingService.findCurrentCompanyMatchingCount(payload.cid);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_ANALYTICS)
  async getAnalytics(
    @Payload() payload: { userId: string; role: string },
  ): Promise<AnalyticsResponseDTO> {
    return this.matchingService.getAnalytics(
      payload.userId,
      payload.role as 'employee' | 'company',
    );
  }
}
