import { AuthUser } from '@app/common/decorators/user.decorator';
import {
  FindOneJobDTO,
  PublicJobDetailDTO,
  PublicJobSitemapEntryDTO,
  SearchJobDTO,
  SearchJobResponseDTO,
  SearchJobResult,
} from '@app/contracts/dtos';
import { PaginationDTO } from '@app/contracts/dtos/shared';

export interface IJobController {
  searchJobs(
    user: AuthUser,
    searchJobQuery: SearchJobDTO,
  ): Promise<SearchJobResult>;
  findAllJobs(pagination: PaginationDTO): Promise<SearchJobResponseDTO[]>;
}

/** The unauthenticated half of the job surface — see PublicJobController. */
export interface IPublicJobController {
  findOneJob(jobId: string): Promise<PublicJobDetailDTO>;
  findPublicJobSitemap(): Promise<PublicJobSitemapEntryDTO[]>;
}

export interface IJobRpcController {
  searchJobs(searchJobDTO: SearchJobDTO): Promise<SearchJobResult>;
  findAllJobs(paginationDTO: PaginationDTO): Promise<SearchJobResponseDTO[]>;
  findOneJob(findOneJobDTO: FindOneJobDTO): Promise<PublicJobDetailDTO | null>;
  findPublicJobSitemap(): Promise<PublicJobSitemapEntryDTO[]>;
}
