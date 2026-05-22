import {
  AnalyticsResponseDTO,
  CreateInterviewDTO,
  CreateInterviewResponseDTO,
  GetInterviewResponseDTO,
  SearchJobResponseDTO,
  SearchJobDTO,
  UpdateInterviewStatusResponseDTO,
  UpdateInterviewStatusDTO,
  MatchCountResponseDTO,
  MatchResponseDTO,
  FindCurrentMatchingResponseDTO,
  MatchDTO,
  GetInterviewsByEmployeeDTO,
  GetInterviewsByCompanyDTO,
  EmployeeMatchLookupDTO,
  CompanyMatchLookupDTO,
  MatchAnalyticsDTO,
  AiMatchExplanationDTO,
  AiMatchExplanationResponseDTO,
  AiInterviewPrepDTO,
  AiInterviewPrepResponseDTO,
} from '@app/contracts/dtos/job';
import { FindCurrentLikeResponseDTO } from '@app/contracts/dtos/job/matching/find-current-like.dto';
import { PaginationDTO } from '@app/contracts/dtos/shared';

export interface IJobController {
  searchJobs(searchJobQuery: SearchJobDTO): Promise<SearchJobResponseDTO[]>;
  findAllJobs(pagination: PaginationDTO): Promise<SearchJobResponseDTO[]>;
}

export interface IJobRpcController {
  searchJobs(searchJobDTO: SearchJobDTO): Promise<SearchJobResponseDTO[]>;
  findAllJobs(paginationDTO: PaginationDTO): Promise<SearchJobResponseDTO[]>;
}

export interface IInterviewController {
  createInterview(
    createInterviewDTO: CreateInterviewDTO,
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
    updateInterviewStatusDTO: UpdateInterviewStatusDTO,
    req?: any,
  ): Promise<UpdateInterviewStatusResponseDTO>;
}

export interface IInterviewRpcController {
  createInterview(
    creteInterviewDTO: CreateInterviewDTO,
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

export interface IMatchingController {
  employeeLikes(matchDTO: MatchDTO, req?: any): Promise<MatchResponseDTO>;
  companyLikes(matchDTO: MatchDTO, req?: any): Promise<MatchResponseDTO>;
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
  ): Promise<MatchCountResponseDTO>;
  findCurrentCompanyMatchingCount(
    cid: string,
    req?: any,
  ): Promise<MatchCountResponseDTO>;
  getAnalytics(id: string, role: string): Promise<AnalyticsResponseDTO>;
  getAiMatchExplanation(
    eid: string,
    cid: string,
    req?: any,
  ): Promise<AiMatchExplanationResponseDTO>;
  getAiInterviewPrep(
    eid: string,
    cid: string,
    req?: any,
  ): Promise<AiInterviewPrepResponseDTO>;
}

export interface IMatchingRpcController {
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
  getAiInterviewPrep(
    aiInterviewPrepDTO: AiInterviewPrepDTO,
  ): Promise<AiInterviewPrepResponseDTO>;
}
