import {
  JobResponseDTO,
  SearchJobResponseDTO,
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
  AnalyticsResponseDTO,
  CompanyMatchLookupDTO,
  EmployeeMatchLookupDTO,
  MatchAnalyticsDTO,
  AiMatchExplanationDTO,
  AiMatchExplanationResponseDTO,
  AiInterviewPrepDTO,
  AiInterviewPrepResponseDTO,
  ApplicationResponseDTO,
  ApplyJobDTO,
  UpdateApplicationStatusDTO,
} from '@app/contracts/dtos/job';
import {
  AiMatchProfilesDTO,
  AiMatchProfilesResponseDTO,
} from '@app/contracts/dtos/job/matching/ai-match-profiles.dto';
import { PaginationDTO } from '@app/contracts/dtos/shared';

export const I_JOB_SERVICE_SERVICE = 'IJobServiceService';
export const I_MATCHING_SERVICE = 'IMatchingService';
export const I_INTERVIEW_SERVICE = 'IInterviewService';
export const I_APPLICATION_SERVICE = 'IApplicationService';

export interface IJobServiceService {
  findAllJobs(paginationDTO: PaginationDTO): Promise<JobResponseDTO[]>;
  searchJobs(searchJobDTO: SearchJobDTO): Promise<SearchJobResponseDTO[]>;
}

export interface IMatchingService {
  employeeLikes(matchDTO: MatchDTO): Promise<MatchResponseDTO>;
  companyLikes(matchDTO: MatchDTO): Promise<MatchResponseDTO>;
  findCurrentEmployeeLiked(
    employeeMatchLookupDTO: EmployeeMatchLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]>;
  findCurrentCompanyLiked(
    companyMatchLookupDTO: CompanyMatchLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]>;
  findCurrentEmployeeMatching(
    employeeMatchLookupDTO: EmployeeMatchLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]>;
  findCurrentCompanyMatching(
    companyMatchLookupDTO: CompanyMatchLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]>;
  findCurrentEmployeeMatchingCount(
    employeeMatchLookupDTO: EmployeeMatchLookupDTO,
  ): Promise<MatchCountResponseDTO>;
  findCurrentCompanyMatchingCount(
    companyMatchLookupDTO: CompanyMatchLookupDTO,
  ): Promise<MatchCountResponseDTO>;
  getAnalytics(
    matchAnalyticsDTO: MatchAnalyticsDTO,
  ): Promise<AnalyticsResponseDTO>;
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
  applyJob(
    employeeId: string,
    applyJobDTO: ApplyJobDTO,
  ): Promise<ApplicationResponseDTO>;
  getMyApplications(employeeId: string): Promise<ApplicationResponseDTO[]>;
  getJobApplications(
    jobId: string,
    companyId: string,
  ): Promise<ApplicationResponseDTO[]>;
  updateApplicationStatus(
    companyId: string,
    updateApplicationStatusDTO: UpdateApplicationStatusDTO,
  ): Promise<ApplicationResponseDTO>;
  withdrawApplication(
    employeeId: string,
    applicationId: string,
  ): Promise<{ message: string }>;
}
