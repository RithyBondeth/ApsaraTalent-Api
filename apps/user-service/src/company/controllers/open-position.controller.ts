import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { IOpenPositionRpcController } from '@app/contracts/interfaces/controller/user-controllers/company-controller.interface';
import {
  I_OPEN_POSITION_SERVICE,
  IOpenPositionService,
} from '@app/contracts/interfaces/service/user-service.interface';
import {
  RemoveOpenPositionDTO,
  RemoveOpenPositionResponseDTO,
} from '@app/contracts/dtos/user';

@Controller()
export class OpenPositionController implements IOpenPositionRpcController {
  constructor(
    @Inject(I_OPEN_POSITION_SERVICE)
    private readonly openPositionService: IOpenPositionService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_OPEN_POSITION)
  async removeOpenPosition(
    @Payload() removeOpenPositionDTO: RemoveOpenPositionDTO,
  ): Promise<RemoveOpenPositionResponseDTO> {
    return this.openPositionService.removeOpenPosition(removeOpenPositionDTO);
  }
}
