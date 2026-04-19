import {
  JobResponseDTO,
  SearchJobResponseDTO,
  CreateInterviewDTO,
  GetInterviewsByCompanyDTO,
  GetInterviewsByEmployeeDTO,
  InterviewResponseDTO,
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
  MatchAnalyticsRequestDTO,
} from '@app/contracts/dtos/job';
import { PaginationDTO } from '@app/contracts/dtos/shared';

export const I_JOB_SERVICE_SERVICE = 'IJobServiceService';
export const I_MATCHING_SERVICE = 'IMatchingService';
export const I_INTERVIEW_SERVICE = 'IInterviewService';

export interface IJobServiceService {
  findAllJobs(data: PaginationDTO): Promise<JobResponseDTO[]>;
  searchJobs(searchParams: SearchJobDTO): Promise<SearchJobResponseDTO[]>;
}

export interface IMatchingService {
  employeeLikes(matchDto: MatchDTO): Promise<MatchResponseDTO>;
  companyLikes(matchDto: MatchDTO): Promise<MatchResponseDTO>;
  findCurrentEmployeeLiked(
    dto: EmployeeMatchLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]>;
  findCurrentCompanyLiked(
    dto: CompanyMatchLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]>;
  findCurrentEmployeeMatching(
    dto: EmployeeMatchLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]>;
  findCurrentCompanyMatching(
    dto: CompanyMatchLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]>;
  findCurrentEmployeeMatchingCount(
    dto: EmployeeMatchLookupDTO,
  ): Promise<MatchCountResponseDTO>;
  findCurrentCompanyMatchingCount(
    dto: CompanyMatchLookupDTO,
  ): Promise<MatchCountResponseDTO>;
  getAnalytics(dto: MatchAnalyticsRequestDTO): Promise<AnalyticsResponseDTO>;
}

export interface IInterviewService {
  createInterview(dto: CreateInterviewDTO): Promise<InterviewResponseDTO>;
  getInterviewsByEmployee(
    dto: GetInterviewsByEmployeeDTO,
  ): Promise<InterviewResponseDTO[]>;
  getInterviewsByCompany(
    dto: GetInterviewsByCompanyDTO,
  ): Promise<InterviewResponseDTO[]>;
  updateInterviewStatus(
    dto: UpdateInterviewStatusDTO,
  ): Promise<InterviewResponseDTO>;
}
