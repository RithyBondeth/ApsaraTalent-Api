import { IFindCompanyController } from '@app/contracts/interfaces/domain/company.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { UserPaginationDTO } from '../../dtos/user-pagination.dto';
import {
  CompanyResponseDTO,
  CountAllUsersResponseDTO,
} from '../../dtos/user-response.dto';
import { FindCompanyService } from '../../services/company-services/find-company.service';

import {
  I_FIND_COMPANY_SERVICE,
  IFindCompanyService,
} from '@app/contracts/interfaces/service/user-service.interface';

@Controller()
export class FindCompanyController implements IFindCompanyController {
  constructor(
    @Inject(I_FIND_COMPANY_SERVICE)
    private readonly findCompanyService: IFindCompanyService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_COMPANY)
  async findAll(
    @Payload() payload: { pagination: UserPaginationDTO },
  ): Promise<CompanyResponseDTO[]> {
    return this.findCompanyService.findAll(payload.pagination);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_ALL_COMPANY)
  async countAllCompanies(): Promise<CountAllUsersResponseDTO> {
    return this.findCompanyService.countAllCompanies();
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ONE_COMPANY_BY_ID)
  async findOneById(
    @Payload() payload: { companyId: string },
  ): Promise<CompanyResponseDTO> {
    return this.findCompanyService.findOneById(payload.companyId);
  }
}
