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
} from '@app/contracts/dtos/job';
import { PaginationDTO } from '@app/contracts/dtos/shared';

export const I_JOB_SERVICE_SERVICE = 'IJobServiceService';
export const I_MATCHING_SERVICE = 'IMatchingService';
export const I_INTERVIEW_SERVICE = 'IInterviewService';

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
