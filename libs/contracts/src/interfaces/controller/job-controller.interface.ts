import {
  AnalyticsResponseDTO,
  CreateInterviewDTO,
  CreateInterviewResponseDTO,
  GetInterviewResponseDTO,
  JobResponseDTO,
  SearchJobResponseDTO,
  MatchCountResponseDTO,
  MatchResponseDTO,
  SearchJobDTO,
  UpdateInterviewResponseDTO,
  UpdateInterviewStatusDTO,
} from '@app/contracts/dtos/job';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { UserResponseDTO } from '@app/contracts/dtos/user';

export interface IJobController {
  searchJobs(searchJobQuery: SearchJobDTO): Promise<SearchJobResponseDTO[]>;
  findAllJobs(pagination: PaginationDTO): Promise<SearchJobResponseDTO[]>;
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
    dto: UpdateInterviewStatusDTO,
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
