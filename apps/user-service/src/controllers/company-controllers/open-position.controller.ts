import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/user-service.constant';
import { OpenPositionService } from '../../services/company-services/open-position.service';

import { IOpenPositionController } from '@app/contracts/interfaces/company.interface';

import {
  I_OPEN_POSITION_SERVICE,
  IOpenPositionService,
} from '@app/contracts/interfaces/user-service.interface';

@Controller()
export class OpenPositionController implements IOpenPositionController {
  constructor(
    @Inject(I_OPEN_POSITION_SERVICE)
    private readonly openPositionService: IOpenPositionService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_OPEN_POSITION)
  async removeOpenPosition(
    @Payload() payload: { companyId: string; opId: string },
  ): Promise<any> {
    return this.openPositionService.removeOpenPosition(
      payload.companyId,
      payload.opId,
    );
  }
}
