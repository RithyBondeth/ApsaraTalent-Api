import { IUpdateCompanyInfoController } from '@app/contracts/interfaces/domain/company.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { UpdateCompanyInfoDTO, CompanyResponseDTO } from '@app/contracts/dtos/user';
import { UpdateCompanyInfoService } from '../../services/company-services/update-company-info.service';

import {
  I_UPDATE_COMPANY_INFO_SERVICE,
  IUpdateCompanyInfoService,
} from '@app/contracts/interfaces/service/user-service.interface';

@Controller()
export class UpdateCompanyInfoController implements IUpdateCompanyInfoController {
  constructor(
    @Inject(I_UPDATE_COMPANY_INFO_SERVICE)
    private readonly updateCompanyInfoService: IUpdateCompanyInfoService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPDATE_COMPANY_INFO)
  async updateCompanyInfo(
    @Payload()
    payload: {
      updateCompanyInfoDTO: UpdateCompanyInfoDTO;
      companyId: string;
    },
  ): Promise<{ message: string; company: CompanyResponseDTO }> {
    return this.updateCompanyInfoService.updateCompanyInfo(
      payload.updateCompanyInfoDTO,
      payload.companyId,
    );
  }
}
