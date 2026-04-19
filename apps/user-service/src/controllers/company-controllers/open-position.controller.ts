import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { OpenPositionService } from '../../services/company-services/open-position.service';

import { IOpenPositionRpcController } from '@app/contracts/interfaces/domain/company.interface';

import {
  I_OPEN_POSITION_SERVICE,
  IOpenPositionService,
} from '@app/contracts/interfaces/service/user-service.interface';
import { CoreResponseDTO } from '@app/contracts/dtos/shared';
import { RemoveOpenPositionDTO } from '@app/contracts/dtos/user';

@Controller()
export class OpenPositionController implements IOpenPositionRpcController {
  constructor(
    @Inject(I_OPEN_POSITION_SERVICE)
    private readonly openPositionService: IOpenPositionService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_OPEN_POSITION)
  async removeOpenPosition(
    @Payload() payload: RemoveOpenPositionDTO,
  ): Promise<CoreResponseDTO> {
    return this.openPositionService.removeOpenPosition(payload);
  }
}
