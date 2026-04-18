import {
  JobResponseDTO, SearchJobResponseDTO,
  MatchDTO,
  CreateInterviewDTO,
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
  employeeLikes(matchDto: MatchDTO): Promise<any>;
  companyLikes(matchDto: MatchDTO): Promise<any>;
  findCurrentEmployeeLiked(eid: string): Promise<UserResponseDTO[]>;
  findCurrentCompanyLiked(cid: string): Promise<UserResponseDTO[]>;
  findCurrentEmployeeMatching(eid: string): Promise<UserResponseDTO[]>;
  findCurrentCompanyMatching(cid: string): Promise<UserResponseDTO[]>;
  findCurrentEmployeeMatchingCount(eid: string): Promise<any>;
  findCurrentCompanyMatchingCount(cid: string): Promise<any>;
  getAnalytics(userId: string, role: 'employee' | 'company'): Promise<any>;
}

export interface IInterviewService {
  createInterview(dto: CreateInterviewDTO): Promise<any>;
  getInterviewsByEmployee(employeeId: string): Promise<any[]>;
  getInterviewsByCompany(companyId: string): Promise<any[]>;
  updateInterviewStatus(dto: UpdateInterviewStatusDTO): Promise<any>;
}
