import { Controller } from '@nestjs/common';
import { OpenPositionService } from '../../services/company-services/open-position.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Controller()
export class OpenPositionController {
  constructor(private readonly openPositionService: OpenPositionService) {}

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
