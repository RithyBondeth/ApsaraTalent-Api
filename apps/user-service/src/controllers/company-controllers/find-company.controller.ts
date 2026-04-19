import { IFindCompanyRpcController } from '@app/contracts/interfaces/domain/company.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  CompanyResponseDTO,
  CountAllUsersResponseDTO,
  PaginationRequestDTO,
  CompanyIdDTO,
} from '@app/contracts/dtos/user';
import { FindCompanyService } from '../../services/company-services/find-company.service';

import {
  I_FIND_COMPANY_SERVICE,
  IFindCompanyService,
} from '@app/contracts/interfaces/service/user-service.interface';

@Controller()
export class FindCompanyController implements IFindCompanyRpcController {
  constructor(
    @Inject(I_FIND_COMPANY_SERVICE)
    private readonly findCompanyService: IFindCompanyService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_COMPANY)
  async findAll(
    @Payload() payload: PaginationRequestDTO,
  ): Promise<CompanyResponseDTO[]> {
    return this.findCompanyService.findAll(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_ALL_COMPANY)
  async countAllCompanies(): Promise<CountAllUsersResponseDTO> {
    return this.findCompanyService.countAllCompanies();
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ONE_COMPANY_BY_ID)
  async findOneById(
    @Payload() payload: CompanyIdDTO,
  ): Promise<CompanyResponseDTO> {
    return this.findCompanyService.findOneById(payload);
  }
}
