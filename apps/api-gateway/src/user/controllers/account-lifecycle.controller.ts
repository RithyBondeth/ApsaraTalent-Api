import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { AuthGuard } from '@app/common/guards/auth.guard';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  AccountDataExportDTO,
  CancelAccountDeletionResponseDTO,
  RequestAccountDeletionResponseDTO,
} from '@app/contracts/dtos/user';
import {
  Controller,
  Get,
  Header,
  Inject,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { rpcCall } from '../../utils/rpc-call';

/**
 * The account owner's terminal actions: request deletion, cancel a pending
 * one, export everything. Sits in its own controller for the same reason
 * `AdminProblemReportController` did — grouping the sensitive routes makes
 * "what can a user do that they cannot take back" a question you answer by
 * opening one file.
 *
 * The export route is a browser download rather than a JSON body — the
 * `Content-Disposition: attachment` header makes the browser save the file
 * rather than render it in place, and gives it a stable filename.
 *
 * Throttled below the platform-wide limits: deleting your account and
 * exporting the platform's copy of your data are both operations that a
 * bored user should not be able to trigger from a script.
 */
@Controller('user/account')
@UseGuards(AuthGuard)
export class AccountLifecycleController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('delete')
  async requestDeletion(
    @User() user: AuthUser,
  ): Promise<RequestAccountDeletionResponseDTO> {
    return rpcCall<RequestAccountDeletionResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REQUEST_ACCOUNT_DELETION,
      { userId: user.id },
    );
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('delete/cancel')
  async cancelDeletion(
    @User() user: AuthUser,
  ): Promise<CancelAccountDeletionResponseDTO> {
    return rpcCall<CancelAccountDeletionResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.CANCEL_ACCOUNT_DELETION,
      { userId: user.id },
    );
  }

  /**
   * Downloads the account's data as a JSON file. Service-side rate-limited
   * to once per 24 hours per user (see `AccountLifecycleService.exportData`);
   * this throttle is a second belt on the same braces.
   *
   * The service returns the DTO; this controller sets the download headers
   * and streams the JSON body. `Content-Type: application/json` keeps the
   * file readable by whatever the user opens it with; `Content-Disposition`
   * gives it a filename dated to now so multiple exports don't overwrite.
   */
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Get('export')
  @Header('Content-Type', 'application/json')
  async exportData(
    @User() user: AuthUser,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const dump = await rpcCall<AccountDataExportDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.EXPORT_ACCOUNT_DATA,
      { userId: user.id },
    );

    const filename = `apsara-talent-export-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(dump, null, 2));
  }
}
