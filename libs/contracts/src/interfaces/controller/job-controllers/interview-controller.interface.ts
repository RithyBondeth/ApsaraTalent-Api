import {
  CreateInterviewDTO,
  CreateInterviewResponseDTO,
  GetInterviewResponseDTO,
  UpdateInterviewStatusDTO,
  UpdateInterviewStatusResponseDTO,
  GetInterviewsByEmployeeDTO,
  GetInterviewsByCompanyDTO,
} from '@app/contracts/dtos';

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
    createInterviewDTO: CreateInterviewDTO,
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
