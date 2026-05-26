import {
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
  AiMatchExplanationDTO,
  AiMatchExplanationResponseDTO,
  AiInterviewPrepDTO,
  AiInterviewPrepResponseDTO,
  MatchingAnalyticsResponseDTO,
  CompanyMatchingLookupDTO,
  EmployeeMatchingLookupDTO,
  MatchingAnalyticsDTO,
} from '@app/contracts/dtos/job';
import {
  AiMatchProfilesDTO,
  AiMatchProfilesResponseDTO,
} from '@app/contracts/dtos/job/matching/ai-match-profiles.dto';
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
  getMatchingAnalytics(
    id: string,
    role: string,
  ): Promise<MatchingAnalyticsResponseDTO>;
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
  streamAiMatchExplanation(
    eid: string,
    cid: string,
    res: Response,
    req?: any,
  ): Promise<void>;
  streamAiInterviewPrep(
    eid: string,
    cid: string,
    interviewTitle: string | undefined,
    res: Response,
    req?: any,
  ): Promise<void>;
  streamAiSkillGap(
    eid: string,
    cid: string,
    res: Response,
    req?: any,
  ): Promise<void>;
}

export interface IMatchingRpcController {
  employeeLikes(matchDTO: MatchDTO): Promise<MatchResponseDTO>;
  companyLikes(matchDTO: MatchDTO): Promise<MatchResponseDTO>;
  findCurrentEmployeeLiked(
    employeeMatchLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]>;
  findCurrentCompanyLiked(
    companyMatchLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]>;
  findCurrentEmployeeMatching(
    employeeMatchLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]>;
  findCurrentCompanyMatching(
    companyMatchLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]>;
  findCurrentEmployeeMatchingCount(
    employeeMatchLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO>;
  findCurrentCompanyMatchingCount(
    companyMatchLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO>;
  getMatchingAnalytics(
    matchAnalyticsDTO: MatchingAnalyticsDTO,
  ): Promise<MatchingAnalyticsResponseDTO>;
  getAiMatchExplanation(
    aiMatchExplanationDTO: AiMatchExplanationDTO,
  ): Promise<AiMatchExplanationResponseDTO>;
  getAiInterviewPrep(
    aiInterviewPrepDTO: AiInterviewPrepDTO,
  ): Promise<AiInterviewPrepResponseDTO>;
  getAiMatchProfiles(
    aiMatchProfilesDTO: AiMatchProfilesDTO,
  ): Promise<AiMatchProfilesResponseDTO>;
}
