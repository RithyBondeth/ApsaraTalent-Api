import { AuthGuard } from '@app/common/guards/auth.guard';
import {
  CreateSavedSearchDTO,
  SavedSearchPreviewResponseDTO,
  SavedSearchResponseDTO,
  UpdateSavedSearchDTO,
} from '@app/contracts';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { ISavedSearchController } from '@app/contracts/interfaces/controller/job-controllers/saved-search-controller.interface';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCall } from '../../utils/rpc-call';
import { JobAccessService } from '../services/job-access.service';

@Controller('job/saved-search')
@UseGuards(AuthGuard)
export class SavedSearchController implements ISavedSearchController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
    private readonly jobAccess: JobAccessService,
  ) {}

  /**
   * Employee-only guard for the whole feature. Kept as one helper because
   * every route below repeats it — a decorator would be nicer but would
   * drift from the pattern the sibling controllers use.
   */
  private async assertEmployee(userId?: string): Promise<void> {
    if (!userId) throw new ForbiddenException('Unauthorized request.');
    const profile = await this.jobAccess.getCurrentUserProfile(userId);
    if (profile?.role !== 'employee') {
      throw new ForbiddenException(
        'Only candidates can manage saved searches.',
      );
    }
  }

  @Get()
  async listSavedSearches(@Req() req?: any): Promise<SavedSearchResponseDTO[]> {
    await this.assertEmployee(req?.user?.id);
    return rpcCall<SavedSearchResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.LIST_SAVED_SEARCHES,
      { employeeId: req.user.id },
    );
  }

  @Post()
  async createSavedSearch(
    @Body() createSavedSearchDTO: CreateSavedSearchDTO,
    @Req() req?: any,
  ): Promise<SavedSearchResponseDTO> {
    await this.assertEmployee(req?.user?.id);
    return rpcCall<SavedSearchResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.CREATE_SAVED_SEARCH,
      { employeeId: req.user.id, createSavedSearchDTO },
    );
  }

  @Patch(':savedSearchId')
  async updateSavedSearch(
    @Param('savedSearchId', ParseUUIDPipe) savedSearchId: string,
    @Body() updateSavedSearchDTO: UpdateSavedSearchDTO,
    @Req() req?: any,
  ): Promise<SavedSearchResponseDTO> {
    await this.assertEmployee(req?.user?.id);
    return rpcCall<SavedSearchResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.UPDATE_SAVED_SEARCH,
      {
        employeeId: req.user.id,
        savedSearchId,
        updateSavedSearchDTO,
      },
    );
  }

  @Delete(':savedSearchId')
  async deleteSavedSearch(
    @Param('savedSearchId', ParseUUIDPipe) savedSearchId: string,
    @Req() req?: any,
  ): Promise<{ message: string }> {
    await this.assertEmployee(req?.user?.id);
    return rpcCall<{ message: string }>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.DELETE_SAVED_SEARCH,
      { employeeId: req.user.id, savedSearchId },
    );
  }

  @Get(':savedSearchId/preview')
  async previewSavedSearch(
    @Param('savedSearchId', ParseUUIDPipe) savedSearchId: string,
    @Req() req?: any,
  ): Promise<SavedSearchPreviewResponseDTO> {
    await this.assertEmployee(req?.user?.id);
    return rpcCall<SavedSearchPreviewResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.PREVIEW_SAVED_SEARCH,
      { employeeId: req.user.id, savedSearchId },
    );
  }
}
