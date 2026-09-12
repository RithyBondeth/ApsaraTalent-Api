import { AuthGuard } from '@app/common/guards/auth.guard';
import { EmployerAnalyticsResponseDTO } from '@app/contracts';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCall } from '../../utils/rpc-call';
import { JobAccessService } from '../services/job-access.service';

/**
 * The employer-only analytics read. Uses the signed-in profile's company id
 * from the auth session rather than trusting a path parameter — a recruiter
 * pulling up "my dashboard" is never asking about a company that isn't theirs.
 */
@Controller('job/employer-analytics')
@UseGuards(AuthGuard)
export class EmployerAnalyticsController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
    private readonly jobAccess: JobAccessService,
  ) {}

  @Get()
  async getEmployerAnalytics(
    @Req() req?: any,
  ): Promise<EmployerAnalyticsResponseDTO> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');
    const profile = await this.jobAccess.getCurrentUserProfile(req.user.id);
    if (profile?.role !== 'company' || !profile?.company?.id) {
      throw new ForbiddenException(
        'Only companies can see employer analytics.',
      );
    }
    return rpcCall<EmployerAnalyticsResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.GET_EMPLOYER_ANALYTICS,
      { companyId: profile.company.id },
    );
  }
}
