import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  MatchDTO,
  MatchResponseDTO,
  MatchCountResponseDTO,
  FindCurrentMatchingResponseDTO,
  FindCurrentLikeResponseDTO,
  AiMatchExplanationDTO,
  AiMatchExplanationResponseDTO,
  AiInterviewPrepDTO,
  AiInterviewPrepResponseDTO,
  CompanyMatchingLookupDTO,
  EmployeeMatchingLookupDTO,
  MatchingAnalyticsDTO,
  MatchingAnalyticsResponseDTO,
} from '@app/contracts/dtos/job';
import {
  I_MATCHING_SERVICE,
  I_MATCHING_ANALYTICS_SERVICE,
  I_MATCHING_AI_SERVICE,
  IMatchingService,
  IMatchingAnalyticsService,
  IMatchingAiService,
} from '@app/contracts/interfaces/service/job-service.interface';
import { IMatchingRpcController } from '@app/contracts/interfaces/controller/job-controllers/matching-controller.interface';
import {
  AiMatchProfilesDTO,
  AiMatchProfilesResponseDTO,
} from '@app/contracts/dtos/job/matching/ai-match-profiles.dto';
import {
  UnMatchDTO,
  UnMatchResposneDTO,
} from '@app/contracts/dtos/job/matching/unmatch.dto';

@Controller()
export class MatchingController implements IMatchingRpcController {
  constructor(
    @Inject(I_MATCHING_SERVICE)
    private readonly matchingService: IMatchingService,
    @Inject(I_MATCHING_ANALYTICS_SERVICE)
    private readonly analyticsService: IMatchingAnalyticsService,
    @Inject(I_MATCHING_AI_SERVICE)
    private readonly aiService: IMatchingAiService,
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

  @MessagePattern(JOB_SERVICE.ACTIONS.UNMATCH)
  async unmatch(
    @Payload() unMatchDTO: UnMatchDTO,
  ): Promise<UnMatchResposneDTO> {
    return this.matchingService.unmatch(unMatchDTO);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_LIKED)
  async findCurrentEmployeeLiked(
    @Payload() employeeMatchLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]> {
    return this.matchingService.findCurrentEmployeeLiked(
      employeeMatchLookupDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_LIKED)
  async findCurrentCompanyLiked(
    @Payload() companyMatchLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]> {
    return this.matchingService.findCurrentCompanyLiked(companyMatchLookupDTO);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING)
  async findCurrentEmployeeMatching(
    @Payload() employeeMatchLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]> {
    return this.matchingService.findCurrentEmployeeMatching(
      employeeMatchLookupDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING)
  async findCurrentCompanyMatching(
    @Payload() companyMatchLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]> {
    return this.matchingService.findCurrentCompanyMatching(
      companyMatchLookupDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING_COUNT)
  async findCurrentEmployeeMatchingCount(
    @Payload() employeeMatchLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO> {
    return this.matchingService.findCurrentEmployeeMatchingCount(
      employeeMatchLookupDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING_COUNT)
  async findCurrentCompanyMatchingCount(
    @Payload() companyMatchLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO> {
    return this.matchingService.findCurrentCompanyMatchingCount(
      companyMatchLookupDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_ANALYTICS)
  async getMatchingAnalytics(
    @Payload() matchingAnalyticsDTO: MatchingAnalyticsDTO,
  ): Promise<MatchingAnalyticsResponseDTO> {
    return this.analyticsService.getMatchingAnalytics(matchingAnalyticsDTO);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.AI_MATCH_EXPLANATION)
  async getAiMatchExplanation(
    @Payload() aiMatchExplanationDTO: AiMatchExplanationDTO,
  ): Promise<AiMatchExplanationResponseDTO> {
    return this.aiService.getAiMatchExplanation(aiMatchExplanationDTO);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_AI_MATCH_PROFILES)
  async getAiMatchProfiles(
    @Payload() aiMatchProfilesDTO: AiMatchProfilesDTO,
  ): Promise<AiMatchProfilesResponseDTO> {
    return this.aiService.getAiMatchProfiles(aiMatchProfilesDTO);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.AI_INTERVIEW_PREP)
  async getAiInterviewPrep(
    @Payload() aiInterviewPrepDTO: AiInterviewPrepDTO,
  ): Promise<AiInterviewPrepResponseDTO> {
    return this.aiService.getAiInterviewPrep(aiInterviewPrepDTO);
  }
}
