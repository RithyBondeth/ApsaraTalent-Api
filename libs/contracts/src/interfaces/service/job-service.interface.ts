import { JobResponseDTO } from 'apps/job-service/src/dtos/job-response.dto';
import { SearchJobDto } from 'apps/job-service/src/dtos/job-search.dto';
import { MatchDto } from 'apps/job-service/src/dtos/match.dto';
import { UserResponseDTO } from 'apps/user-service/src/dtos/user-response.dto';
import {
  CreateInterviewDto,
  UpdateInterviewStatusDto,
} from 'apps/job-service/src/dtos/interview.dto';

export const I_JOB_SERVICE_SERVICE = 'IJobServiceService';
export const I_MATCHING_SERVICE = 'IMatchingService';
export const I_INTERVIEW_SERVICE = 'IInterviewService';

export interface IJobServiceService {
  findAllJobs(skip?: number, limit?: number): Promise<JobResponseDTO[]>;
  searchJobs(searchParams: SearchJobDto): Promise<JobResponseDTO[]>;
}

export interface IMatchingService {
  employeeLikes(matchDto: MatchDto): Promise<any>;
  companyLikes(matchDto: MatchDto): Promise<any>;
  findCurrentEmployeeLiked(eid: string): Promise<UserResponseDTO[]>;
  findCurrentCompanyLiked(cid: string): Promise<UserResponseDTO[]>;
  findCurrentEmployeeMatching(eid: string): Promise<UserResponseDTO[]>;
  findCurrentCompanyMatching(cid: string): Promise<UserResponseDTO[]>;
  findCurrentEmployeeMatchingCount(eid: string): Promise<any>;
  findCurrentCompanyMatchingCount(cid: string): Promise<any>;
  getAnalytics(userId: string, role: 'employee' | 'company'): Promise<any>;
}

export interface IInterviewService {
  createInterview(dto: CreateInterviewDto): Promise<any>;
  getInterviewsByEmployee(employeeId: string): Promise<any[]>;
  getInterviewsByCompany(companyId: string): Promise<any[]>;
  updateInterviewStatus(dto: UpdateInterviewStatusDto): Promise<any>;
}
