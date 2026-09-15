import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  AccountDataExportDTO,
  AccountLifecycleUserDTO,
  CancelAccountDeletionResponseDTO,
  RequestAccountDeletionResponseDTO,
} from '@app/contracts/dtos/user';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AccountLifecycleService } from '../services/account-lifecycle.service';

/**
 * RPC surface for the account owner's lifecycle actions. Separate controller
 * from `UserController` because these are terminal, sensitive operations —
 * grouping them makes "what can a user do to their own account" a question
 * you answer by opening one file.
 */
@Controller()
export class AccountLifecycleController {
  constructor(
    private readonly accountLifecycleService: AccountLifecycleService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.REQUEST_ACCOUNT_DELETION)
  async requestDeletion(
    @Payload() dto: AccountLifecycleUserDTO,
  ): Promise<RequestAccountDeletionResponseDTO> {
    return this.accountLifecycleService.requestDeletion(dto);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.CANCEL_ACCOUNT_DELETION)
  async cancelDeletion(
    @Payload() dto: AccountLifecycleUserDTO,
  ): Promise<CancelAccountDeletionResponseDTO> {
    return this.accountLifecycleService.cancelDeletion(dto);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.EXPORT_ACCOUNT_DATA)
  async exportData(
    @Payload() dto: AccountLifecycleUserDTO,
  ): Promise<AccountDataExportDTO> {
    return this.accountLifecycleService.exportData(dto);
  }
}
