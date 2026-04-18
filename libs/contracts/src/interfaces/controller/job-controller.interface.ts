import {
  AnalyticsResponseDTO,
  CreateInterviewDTO,
  CreateInterviewResponseDTO,
  GetInterviewResponseDTO,
  JobResponseDTO,
  MatchCountResponseDTO,
  MatchResponseDTO,
  SearchJobDTO,
  UpdateInterviewResponseDTO,
  UpdateInterviewStatusDto,
} from '@app/contracts/dtos/job';
import { PaginationDTO, UserResponseDTO } from '@app/contracts/dtos/user';

export interface IJobController {
  searchJobs(searchJobQuery: SearchJobDTO): Promise<JobResponseDTO[]>;
  findAllJobs(pagination: PaginationDTO): Promise<JobResponseDTO[]>;
}

export interface IInterviewController {
  createInterview(
    dto: CreateInterviewDTO,
    req?: any,
  ): Promise<CreateInterviewResponseDTO>;
  getInterviewsByEmployee(
    employeeId: string,
    req?: any,
  ): Promise<GetInterviewResponseDTO[]>;
  getInterviewsByCompany(
    companyId: string,
    req?: any,
  ): Promise<GetInterviewResponseDTO[]>;
  updateInterviewStatus(
    dto: UpdateInterviewStatusDto,
    req?: any,
  ): Promise<UpdateInterviewResponseDTO>;
}

export interface IMatchingController {
  employeeLikes(eid: string, cid: string, req?: any): Promise<MatchResponseDTO>;
  companyLikes(cid: string, eid: string, req?: any): Promise<MatchResponseDTO>;
  findCurrentEmployeeLiked(eid: string, req?: any): Promise<UserResponseDTO[]>;
  findCurrentCompanyLiked(cid: string, req?: any): Promise<UserResponseDTO[]>;
  findCurrentEmployeeMatching(
    eid: string,
    req?: any,
  ): Promise<UserResponseDTO[]>;
  findCurrentCompanyMatching(
    cid: string,
    req?: any,
  ): Promise<UserResponseDTO[]>;
  findCurrentEmployeeMatchingCount(
    eid: string,
    req?: any,
  ): Promise<MatchCountResponseDTO>;
  findCurrentCompanyMatchingCount(
    cid: string,
    req?: any,
  ): Promise<MatchCountResponseDTO>;
  getAnalytics(id: string, role: string): Promise<AnalyticsResponseDTO>;
}
