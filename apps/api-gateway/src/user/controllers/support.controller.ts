import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { AuthGuard } from '@app/common/guards/auth.guard';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  ReportProblemBodyDTO,
  ReportProblemResponseDTO,
} from '@app/contracts/dtos/user';
import { ISupportController } from '@app/contracts/interfaces/controller/user-controllers/support-controller.interface';
import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCall } from '../../utils/rpc-call';

@Controller('user/support')
@UseGuards(AuthGuard)
export class SupportController implements ISupportController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('report-problem')
  async reportProblem(
    @User() user: AuthUser,
    @Body() body: ReportProblemBodyDTO,
  ): Promise<ReportProblemResponseDTO> {
    return rpcCall<ReportProblemResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REPORT_PROBLEM,
      {
        reporterId: user.id,
        category: body.category,
        details: body.details,
        pageUrl: body.pageUrl,
        userAgent: body.userAgent,
      },
    );
  }
}
