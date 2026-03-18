import { AuthGuard } from '@app/common/guards/auth.guard';
import { IMatchingController } from '@app/common/interfaces/job-controller.interface';
import {
    Controller,
    ForbiddenException,
    Get,
    Inject,
    Param,
    ParseUUIDPipe,
    Post,
    Req,
    UseGuards
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JOB_SERVICE } from 'utils/constants/job-service.constant';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Controller('match')
@UseGuards(AuthGuard)
export class JobMatchingController implements IMatchingController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  private async getCurrentUserProfile(userId: string): Promise<any> {
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.GET_CURRENT_USER, {
        userID: userId,
      }),
    );
  }

  private async assertEmployeeAccess(
    requestUserId: string,
    employeeId: string,
  ): Promise<void> {
    if (!requestUserId) {
      throw new ForbiddenException('Unauthorized request.');
    }
    const profile = await this.getCurrentUserProfile(requestUserId);
    if (
      profile?.role !== 'employee' ||
      !profile?.employee?.id ||
      profile.employee.id !== employeeId
    ) {
      throw new ForbiddenException(
        'You do not have permission to access this employee resource.',
      );
    }
  }

  private async assertCompanyAccess(
    requestUserId: string,
    companyId: string,
  ): Promise<void> {
    if (!requestUserId) {
      throw new ForbiddenException('Unauthorized request.');
    }
    const profile = await this.getCurrentUserProfile(requestUserId);
    if (
      profile?.role !== 'company' ||
      !profile?.company?.id ||
      profile.company.id !== companyId
    ) {
      throw new ForbiddenException(
        'You do not have permission to access this company resource.',
      );
    }
  }

  @Post('employee/:eid/like/:cid')
  async employeeLikes(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    const payload = { eid, cid };
    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.EMPLOYEE_LIKES, payload),
    );
  }

  @Post('company/:cid/like/:eid')
  async companyLikes(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    const payload = { cid, eid };
    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.COMPANY_LIKES, payload),
    );
  }

  @Get('current-employee-liked/:eid')
  async findCurrentEmployeeLiked(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    const payload = { eid };
    return firstValueFrom(
      this.jobClient.send(
        JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_LIKED,
        payload,
      ),
    );
  }

  @Get('current-company-liked/:cid')
  async findCurrentCompanyLiked(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    const payload = { cid };
    return firstValueFrom(
      this.jobClient.send(
        JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_LIKED,
        payload,
      ),
    );
  }

  @Get('current-employee-matching/:eid')
  async findCurrentEmployeeMatching(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    const payload = { eid };
    return firstValueFrom(
      this.jobClient.send(
        JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING,
        payload,
      ),
    );
  }

  @Get('current-company-matching/:cid')
  async findCurrentCompanyMatching(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    const payload = { cid };
    return firstValueFrom(
      this.jobClient.send(
        JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING,
        payload,
      ),
    );
  }

  @Get('current-employee-matching-count/:eid')
  async findCurrentEmployeeMatchingCount(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    const payload = { eid };
    return firstValueFrom(
      this.jobClient.send(
        JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING_COUNT,
        payload,
      ),
    );
  }

  @Get('current-company-matching-count/:cid')
  async findCurrentCompanyMatchingCount(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    const payload = { cid };
    return firstValueFrom(
      this.jobClient.send(
        JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING_COUNT,
        payload,
      ),
    );
  }
}
