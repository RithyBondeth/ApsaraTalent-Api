import {
  JobResponseDTO,
  SearchJobResponseDTO,
  MatchDTO,
  MatchResponseDTO,
  MatchCountResponseDTO,
  AnalyticsResponseDTO,
  CreateInterviewDTO,
  InterviewResponseDTO,
  UpdateInterviewStatusDTO,
  SearchJobDTO,
} from '@app/contracts/dtos/job';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { UserResponseDTO } from '@app/contracts/dtos/user';

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
  findCurrentEmployeeLiked(eid: string): Promise<UserResponseDTO[]>;
  findCurrentCompanyLiked(cid: string): Promise<UserResponseDTO[]>;
  findCurrentEmployeeMatching(eid: string): Promise<UserResponseDTO[]>;
  findCurrentCompanyMatching(cid: string): Promise<UserResponseDTO[]>;
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
