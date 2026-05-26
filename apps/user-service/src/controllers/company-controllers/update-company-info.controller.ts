import { IUpdateCompanyInfoRpcController } from '@app/contracts/interfaces/controller/company-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  UpdateCompanyInfoRpcDTO,
  UpdateCompanyInfoResponseDTO,
} from '@app/contracts/dtos/user';
import {
  I_UPDATE_COMPANY_INFO_SERVICE,
  IUpdateCompanyInfoService,
} from '@app/contracts/interfaces/service/user-service.interface';

@Controller()
export class UpdateCompanyInfoController implements IUpdateCompanyInfoRpcController {
  constructor(
    @Inject(I_UPDATE_COMPANY_INFO_SERVICE)
    private readonly updateCompanyInfoService: IUpdateCompanyInfoService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPDATE_COMPANY_INFO)
  async updateCompanyInfo(
    @Payload() updateCompanyInfoRpcDTO: UpdateCompanyInfoRpcDTO,
  ): Promise<UpdateCompanyInfoResponseDTO> {
    return this.updateCompanyInfoService.updateCompanyInfo(
      updateCompanyInfoRpcDTO,
    );
  }
}
