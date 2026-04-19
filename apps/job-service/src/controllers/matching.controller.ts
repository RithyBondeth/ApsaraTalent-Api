import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserResponseDTO } from '@app/contracts/dtos/user';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  MatchDTO,
  MatchResponseDTO,
  MatchCountResponseDTO,
  AnalyticsResponseDTO,
  CompanyMatchLookupDTO,
  EmployeeMatchLookupDTO,
  MatchAnalyticsRequestDTO,
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
    @Payload() matchDTO: MatchDTO,
  ): Promise<MatchResponseDTO> {
    return this.matchingService.employeeLikes(matchDTO);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.COMPANY_LIKES)
  async companyLikes(@Payload() matchDTO: MatchDTO): Promise<MatchResponseDTO> {
    return this.matchingService.companyLikes(matchDTO);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_LIKED)
  async findCurrentEmployeeLiked(
    @Payload() payload: EmployeeMatchLookupDTO,
  ): Promise<UserResponseDTO[]> {
    return this.matchingService.findCurrentEmployeeLiked(payload);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_LIKED)
  async findCurrentCompanyLiked(
    @Payload() payload: CompanyMatchLookupDTO,
  ): Promise<UserResponseDTO[]> {
    return this.matchingService.findCurrentCompanyLiked(payload);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING)
  async findCurrentEmployeeMatching(
    @Payload() payload: EmployeeMatchLookupDTO,
  ): Promise<UserResponseDTO[]> {
    return this.matchingService.findCurrentEmployeeMatching(payload);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING)
  async findCurrentCompanyMatching(
    @Payload() payload: CompanyMatchLookupDTO,
  ): Promise<UserResponseDTO[]> {
    return this.matchingService.findCurrentCompanyMatching(payload);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING_COUNT)
  async findCurrentEmployeeMatchingCount(
    @Payload() payload: EmployeeMatchLookupDTO,
  ): Promise<MatchCountResponseDTO> {
    return this.matchingService.findCurrentEmployeeMatchingCount(payload);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING_COUNT)
  async findCurrentCompanyMatchingCount(
    @Payload() payload: CompanyMatchLookupDTO,
  ): Promise<MatchCountResponseDTO> {
    return this.matchingService.findCurrentCompanyMatchingCount(payload);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_ANALYTICS)
  async getAnalytics(
    @Payload() payload: MatchAnalyticsRequestDTO,
  ): Promise<AnalyticsResponseDTO> {
    return this.matchingService.getAnalytics(payload);
  }
}
