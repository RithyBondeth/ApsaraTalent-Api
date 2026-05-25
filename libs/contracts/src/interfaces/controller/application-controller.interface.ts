import {
  ApplyApplicationDTO,
  ApplyApplicationResponseDTO,
  GetApplicationResponseDTO,
  UpdateApplicationStatusDTO,
  UpdateApplicationStatusResponseDTO,
} from '../../dtos';

export interface IApplicationController {
  applyApplication(
    applyApplicationDTO: ApplyApplicationDTO,
    req?: any,
  ): Promise<ApplyApplicationResponseDTO>;
  getMyApplications(req?: any): Promise<GetApplicationResponseDTO[]>;
  getJobApplications(
    jobId: string,
    companyId: string,
    req?: any,
  ): Promise<GetApplicationResponseDTO[]>;
  updateApplicationStatus(
    updateApplicationStatusDTO: UpdateApplicationStatusDTO,
    req?: any,
  ): Promise<UpdateApplicationStatusResponseDTO>;
  withdrawApplication(
    applicationId: string,
    req?: any,
  ): Promise<{ message: string }>;
}

export interface IApplicationRpcController {
  applyApplication(payload: {
    employeeId: string;
    applyApplicationDTO: ApplyApplicationDTO;
  }): Promise<ApplyApplicationResponseDTO>;
  getMyApplications(payload: {
    employeeId: string;
  }): Promise<GetApplicationResponseDTO[]>;
  getJobApplications(payload: {
    jobId: string;
    companyId: string;
  }): Promise<GetApplicationResponseDTO[]>;
  updateApplicationStatus(payload: {
    companyId: string;
    updateApplicationStatusDTO: UpdateApplicationStatusDTO;
  }): Promise<UpdateApplicationStatusResponseDTO>;
  withdrawApplication(payload: {
    employeeId: string;
    applicationId: string;
  }): Promise<{ message: string }>;
}
