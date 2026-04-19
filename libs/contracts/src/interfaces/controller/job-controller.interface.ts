import {
  GetAnalyticsResponseDTO,
  CreateInterviewDTO,
  CreateInterviewResponseDTO,
  GetInterviewResponseDTO,
  SearchJobResponseDTO,
  SearchJobDTO,
  UpdateInterviewResponseDTO,
  UpdateInterviewStatusDTO,
  CountMatchingResponseDTO,
  LikeResponseDTO,
  FindCurrentMatchingResponseDTO,
} from '@app/contracts/dtos/job';
import { FindCurrentLikeResponseDTO } from '@app/contracts/dtos/job/matching/find-current-like.dto';
import { PaginationDTO } from '@app/contracts/dtos/shared';

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
  employeeLikes(eid: string, cid: string, req?: any): Promise<LikeResponseDTO>;
  companyLikes(cid: string, eid: string, req?: any): Promise<LikeResponseDTO>;
  findCurrentEmployeeLiked(
    eid: string,
    req?: any,
  ): Promise<FindCurrentLikeResponseDTO[]>;
  findCurrentCompanyLiked(
    cid: string,
    req?: any,
  ): Promise<FindCurrentLikeResponseDTO[]>;
  findCurrentEmployeeMatching(
    eid: string,
    req?: any,
  ): Promise<FindCurrentMatchingResponseDTO[]>;
  findCurrentCompanyMatching(
    cid: string,
    req?: any,
  ): Promise<FindCurrentMatchingResponseDTO[]>;
  findCurrentEmployeeMatchingCount(
    eid: string,
    req?: any,
  ): Promise<CountMatchingResponseDTO>;
  findCurrentCompanyMatchingCount(
    cid: string,
    req?: any,
  ): Promise<CountMatchingResponseDTO>;
  getAnalytics(id: string, role: string): Promise<GetAnalyticsResponseDTO>;
}
