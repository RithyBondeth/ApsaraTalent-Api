import {
  FindOneJobDTO,
  JobResponseDTO,
  PublicJobDetailDTO,
  PublicJobSitemapEntryDTO,
  SearchJobResult,
  CreateInterviewDTO,
  GetInterviewsByCompanyDTO,
  GetInterviewsByEmployeeDTO,
  CreateInterviewResponseDTO,
  GetInterviewResponseDTO,
  UpdateInterviewStatusResponseDTO,
  UpdateInterviewStatusDTO,
  SearchJobDTO,
  MatchDTO,
  MatchResponseDTO,
  FindCurrentLikeResponseDTO,
  FindCurrentMatchingResponseDTO,
  MatchCountResponseDTO,
  AiMatchExplanationDTO,
  AiMatchExplanationResponseDTO,
  AiInterviewPrepDTO,
  AiInterviewPrepResponseDTO,
  UpdateApplicationStatusDTO,
  ApplyApplicationDTO,
  ApplyApplicationResponseDTO,
  GetApplicationResponseDTO,
  UpdateApplicationStatusResponseDTO,
  MatchingAnalyticsResponseDTO,
  CompanyMatchingLookupDTO,
  EmployeeMatchingLookupDTO,
  MatchingAnalyticsDTO,
} from '@app/contracts/dtos/job';
import {
  AiMatchProfilesDTO,
  AiMatchProfilesResponseDTO,
} from '@app/contracts/dtos/job/matching/ai-match-profiles.dto';
import {
  UnMatchDTO,
  UnMatchResposneDTO,
} from '@app/contracts/dtos/job/matching/unmatch.dto';
import { PaginationDTO } from '@app/contracts/dtos/shared';

export const I_JOB_SERVICE_SERVICE = 'IJobServiceService';
export const I_MATCHING_SERVICE = 'IMatchingService';
export const I_MATCHING_QUERY_SERVICE = 'IMatchingQueryService';
export const I_MATCHING_ANALYTICS_SERVICE = 'IMatchingAnalyticsService';
export const I_MATCHING_AI_SERVICE = 'IMatchingAiService';
export const I_INTERVIEW_SERVICE = 'IInterviewService';
export const I_APPLICATION_SERVICE = 'IApplicationService';

export interface IJobServiceService {
  findAllJobs(paginationDTO: PaginationDTO): Promise<JobResponseDTO[]>;
  searchJobs(searchJobDTO: SearchJobDTO): Promise<SearchJobResult>;
  /** Null for a job that is missing, expired, hidden, or from a suspended account. */
  findOneJob(findOneJobDTO: FindOneJobDTO): Promise<PublicJobDetailDTO | null>;
  findPublicJobSitemap(): Promise<PublicJobSitemapEntryDTO[]>;
}

export interface IMatchingService {
  employeeLikes(matchDTO: MatchDTO): Promise<MatchResponseDTO>;
  companyLikes(matchDTO: MatchDTO): Promise<MatchResponseDTO>;
  unmatch(unMatchDTO: UnMatchDTO): Promise<UnMatchResposneDTO>;
  /**
   * Stamp every one of this side's matches as seen and return the recomputed
   * counts. Returning them here means opening the matching list needs one
   * round trip, and the client never infers the new badge number itself.
   */
  markEmployeeMatchingSeen(
    employeeMatchingLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO>;
  markCompanyMatchingSeen(
    companyMatchingLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO>;
}

/** Read side of matching: cached lists and counts. */
export interface IMatchingQueryService {
  findCurrentEmployeeLiked(
    employeeMatchLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]>;
  findCurrentCompanyLiked(
    companyMatchLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]>;
  findCurrentEmployeeMatching(
    employeeMatchLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]>;
  findCurrentCompanyMatching(
    companyMatchLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]>;
  findCurrentEmployeeMatchingCount(
    employeeMatchLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO>;
  findCurrentCompanyMatchingCount(
    companyMatchLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO>;
}

export interface IMatchingAnalyticsService {
  getMatchingAnalytics(
    matchAnalyticsDTO: MatchingAnalyticsDTO,
  ): Promise<MatchingAnalyticsResponseDTO>;
}

export interface IMatchingAiService {
  getAiMatchExplanation(
    aiMatchExplanationDTO: AiMatchExplanationDTO,
  ): Promise<AiMatchExplanationResponseDTO>;
  getAiMatchProfiles(
    aiMatchProfilesDTO: AiMatchProfilesDTO,
  ): Promise<AiMatchProfilesResponseDTO>;
  getAiInterviewPrep(
    aiInterviewPrepDTO: AiInterviewPrepDTO,
  ): Promise<AiInterviewPrepResponseDTO>;
}

export interface IInterviewService {
  createInterview(
    createInterviewDTO: CreateInterviewDTO,
  ): Promise<CreateInterviewResponseDTO>;
  getInterviewsByEmployee(
    getInterviewsByEmployeeDTO: GetInterviewsByEmployeeDTO,
  ): Promise<GetInterviewResponseDTO[]>;
  getInterviewsByCompany(
    getInterviewsByCompanyDTO: GetInterviewsByCompanyDTO,
  ): Promise<GetInterviewResponseDTO[]>;
  updateInterviewStatus(
    updateInterviewStatusDTO: UpdateInterviewStatusDTO,
  ): Promise<UpdateInterviewStatusResponseDTO>;
}

export interface IApplicationService {
  applyApplication(
    employeeId: string,
    applyApplicationDTO: ApplyApplicationDTO,
  ): Promise<ApplyApplicationResponseDTO>;
  getMyApplications(employeeId: string): Promise<GetApplicationResponseDTO[]>;
  getJobApplications(
    jobId: string,
    companyId: string,
  ): Promise<GetApplicationResponseDTO[]>;
  updateApplicationStatus(
    companyId: string,
    updateApplicationStatusDTO: UpdateApplicationStatusDTO,
  ): Promise<UpdateApplicationStatusResponseDTO>;
  withdrawApplication(
    employeeId: string,
    applicationId: string,
  ): Promise<{ message: string }>;
}
