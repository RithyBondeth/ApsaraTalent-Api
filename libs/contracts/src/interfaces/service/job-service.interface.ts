import {
  JobResponseDTO,
  SearchJobResponseDTO,
  CreateInterviewDTO,
  InterviewResponseDTO,
  UpdateInterviewStatusDTO,
  SearchJobDTO,
  MatchDTO,
  MatchResponseDTO,
  FindCurrentLikeResponseDTO,
  FindCurrentMatchingResponseDTO,
  MatchCountResponseDTO,
  AnalyticsResponseDTO,
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
  findCurrentEmployeeLiked(eid: string): Promise<FindCurrentLikeResponseDTO[]>;
  findCurrentCompanyLiked(cid: string): Promise<FindCurrentLikeResponseDTO[]>;
  findCurrentEmployeeMatching(
    eid: string,
  ): Promise<FindCurrentMatchingResponseDTO[]>;
  findCurrentCompanyMatching(
    cid: string,
  ): Promise<FindCurrentMatchingResponseDTO[]>;
  findCurrentEmployeeMatchingCount(eid: string): Promise<MatchCountResponseDTO>;
  findCurrentCompanyMatchingCount(cid: string): Promise<MatchCountResponseDTO>;
  getAnalytics(
    userId: string,
    role: 'employee' | 'company',
  ): Promise<AnalyticsResponseDTO>;
}

export interface IInterviewService {
  createInterview(dto: CreateInterviewDTO): Promise<InterviewResponseDTO>;
  getInterviewsByEmployee(employeeId: string): Promise<InterviewResponseDTO[]>;
  getInterviewsByCompany(companyId: string): Promise<InterviewResponseDTO[]>;
  updateInterviewStatus(
    dto: UpdateInterviewStatusDTO,
  ): Promise<InterviewResponseDTO>;
}
