import { Response } from 'express';
import {
  MatchDTO,
  MatchResponseDTO,
  FindCurrentLikeResponseDTO,
  FindCurrentMatchingResponseDTO,
  MatchCountResponseDTO,
  MatchingAnalyticsResponseDTO,
  AiMatchExplanationResponseDTO,
  AiInterviewPrepResponseDTO,
  EmployeeMatchingLookupDTO,
  CompanyMatchingLookupDTO,
  MatchingAnalyticsDTO,
  AiMatchExplanationDTO,
  AiInterviewPrepDTO,
} from '@app/contracts/dtos';
import {
  AiMatchProfilesDTO,
  AiMatchProfilesResponseDTO,
} from '@app/contracts/dtos/job/matching/ai-match-profiles.dto';
import {
  UnMatchDTO,
  UnMatchResposneDTO,
} from '@app/contracts/dtos/job/matching/unmatch.dto';

export interface IMatchingController {
  employeeLikes(matchDTO: MatchDTO, req?: any): Promise<MatchResponseDTO>;
  companyLikes(matchDTO: MatchDTO, req?: any): Promise<MatchResponseDTO>;
  unmatch(unMatchDTO: UnMatchDTO, req?: any): Promise<UnMatchResposneDTO>;
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
    req?: any,
  ): Promise<MatchingAnalyticsResponseDTO>;
  getAiMatchExplanation(
    eid: string,
    cid: string,
    lang?: string,
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
    lang: string | undefined,
    req: any,
    res: Response,
  ): Promise<void>;
  streamAiInterviewPrep(
    eid: string,
    cid: string,
    interviewTitle: string | undefined,
    req: any,
    res: Response,
  ): Promise<void>;
  streamAiSkillGap(
    eid: string,
    cid: string,
    lang: string | undefined,
    req: any,
    res: Response,
  ): Promise<void>;
}

export interface IMatchingRpcController {
  employeeLikes(matchDTO: MatchDTO): Promise<MatchResponseDTO>;
  companyLikes(matchDTO: MatchDTO): Promise<MatchResponseDTO>;
  unmatch(unMatchDTO: UnMatchDTO): Promise<UnMatchResposneDTO>;
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
