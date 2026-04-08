import { IUpdateCompanyInfoController } from '@app/common/interfaces/company.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { UpdateCompanyInfoDTO } from '../../dtos/company/update-company-info.dto';
import { CompanyResponseDTO } from '../../dtos/user-response.dto';
import { UpdateCompanyInfoService } from '../../services/company-services/update-company-info.service';

import {
  I_UPDATE_COMPANY_INFO_SERVICE,
  IUpdateCompanyInfoService,
} from '@app/common/interfaces/user-service.interface';

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
