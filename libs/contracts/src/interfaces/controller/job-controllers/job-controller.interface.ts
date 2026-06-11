import {
  SearchJobDTO,
  SearchJobResponseDTO,
  SearchJobResult,
} from '@app/contracts/dtos';
import { PaginationDTO } from '@app/contracts/dtos/shared';

export interface IJobController {
  searchJobs(searchJobQuery: SearchJobDTO): Promise<SearchJobResult>;
  findAllJobs(pagination: PaginationDTO): Promise<SearchJobResponseDTO[]>;
}

export interface IJobRpcController {
  searchJobs(searchJobDTO: SearchJobDTO): Promise<SearchJobResult>;
  findAllJobs(paginationDTO: PaginationDTO): Promise<SearchJobResponseDTO[]>;
}
