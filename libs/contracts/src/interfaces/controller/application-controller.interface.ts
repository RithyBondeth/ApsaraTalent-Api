import {
  ApplyJobDTO,
  ApplicationResponseDTO,
  UpdateApplicationStatusDTO,
} from '@app/contracts/dtos';

export interface IApplicationController {
  applyJob(
    applyJobDTO: ApplyJobDTO,
    req?: any,
  ): Promise<ApplicationResponseDTO>;
  getMyApplications(req?: any): Promise<ApplicationResponseDTO[]>;
  getJobApplications(
    jobId: string,
    companyId: string,
    req?: any,
  ): Promise<ApplicationResponseDTO[]>;
  updateApplicationStatus(
    updateApplicationStatusDTO: UpdateApplicationStatusDTO,
    req?: any,
  ): Promise<ApplicationResponseDTO>;
  withdrawApplication(
    applicationId: string,
    req?: any,
  ): Promise<{ message: string }>;
}

export interface IApplicationRpcController {
  applyJob(payload: {
    employeeId: string;
    applyJobDTO: ApplyJobDTO;
  }): Promise<ApplicationResponseDTO>;
  getMyApplications(payload: {
    employeeId: string;
  }): Promise<ApplicationResponseDTO[]>;
  getJobApplications(payload: {
    jobId: string;
    companyId: string;
  }): Promise<ApplicationResponseDTO[]>;
  updateApplicationStatus(payload: {
    companyId: string;
    updateApplicationStatusDTO: UpdateApplicationStatusDTO;
  }): Promise<ApplicationResponseDTO>;
  withdrawApplication(payload: {
    employeeId: string;
    applicationId: string;
  }): Promise<{ message: string }>;
}
