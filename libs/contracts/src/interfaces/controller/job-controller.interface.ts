import { JobResponseDTO } from 'apps/job-service/src/dtos/job-response.dto';
import { UserResponseDTO } from 'apps/user-service/src/dtos/user-response.dto';

export interface IJobController {
  searchJobs(data?: any): Promise<JobResponseDTO[]>;
  findAllJobs(data?: any): Promise<JobResponseDTO[]>;
}

export interface IInterviewController {
  createInterview(dto?: any, req?: any): Promise<any>;
  getInterviewsByEmployee(employeeId?: any, req?: any): Promise<any>;
  getInterviewsByCompany(companyId?: any, req?: any): Promise<any>;
  updateInterviewStatus(dto?: any, req?: any): Promise<any>;
}

export interface IMatchingController {
  employeeLikes(data?: any, id?: any): Promise<any>;
  companyLikes(data?: any, id?: any): Promise<any>;
  findCurrentEmployeeLiked(data?: any, id?: any): Promise<UserResponseDTO[]>;
  findCurrentCompanyLiked(data?: any, id?: any): Promise<UserResponseDTO[]>;
  findCurrentEmployeeMatching(
    data?: any,
    req?: any,
  ): Promise<UserResponseDTO[]>;
  findCurrentCompanyMatching(data?: any, req?: any): Promise<UserResponseDTO[]>;
  findCurrentEmployeeMatchingCount(data?: any, id?: any): Promise<any>;
  findCurrentCompanyMatchingCount(data?: any, id?: any): Promise<any>;
  getAnalytics(id?: any, role?: any): Promise<any>;
}
