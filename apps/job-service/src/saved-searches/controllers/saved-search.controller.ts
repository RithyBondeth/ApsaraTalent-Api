import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  CreateSavedSearchDTO,
  I_SAVED_SEARCH_SERVICE,
  ISavedSearchService,
  SavedSearchPreviewResponseDTO,
  SavedSearchResponseDTO,
  UpdateSavedSearchDTO,
} from '@app/contracts';
import { ISavedSearchRpcController } from '@app/contracts/interfaces/controller/job-controllers/saved-search-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class SavedSearchController implements ISavedSearchRpcController {
  constructor(
    @Inject(I_SAVED_SEARCH_SERVICE)
    private readonly savedSearchService: ISavedSearchService,
  ) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.LIST_SAVED_SEARCHES)
  listSavedSearches(
    @Payload('employeeId') employeeId: string,
  ): Promise<SavedSearchResponseDTO[]> {
    return this.savedSearchService.listSavedSearches(employeeId);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.CREATE_SAVED_SEARCH)
  createSavedSearch(
    @Payload('employeeId') employeeId: string,
    @Payload('createSavedSearchDTO')
    createSavedSearchDTO: CreateSavedSearchDTO,
  ): Promise<SavedSearchResponseDTO> {
    return this.savedSearchService.createSavedSearch(
      employeeId,
      createSavedSearchDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.UPDATE_SAVED_SEARCH)
  updateSavedSearch(
    @Payload('employeeId') employeeId: string,
    @Payload('savedSearchId') savedSearchId: string,
    @Payload('updateSavedSearchDTO')
    updateSavedSearchDTO: UpdateSavedSearchDTO,
  ): Promise<SavedSearchResponseDTO> {
    return this.savedSearchService.updateSavedSearch(
      employeeId,
      savedSearchId,
      updateSavedSearchDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.DELETE_SAVED_SEARCH)
  deleteSavedSearch(
    @Payload('employeeId') employeeId: string,
    @Payload('savedSearchId') savedSearchId: string,
  ): Promise<{ message: string }> {
    return this.savedSearchService.deleteSavedSearch(employeeId, savedSearchId);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.PREVIEW_SAVED_SEARCH)
  previewSavedSearch(
    @Payload('employeeId') employeeId: string,
    @Payload('savedSearchId') savedSearchId: string,
  ): Promise<SavedSearchPreviewResponseDTO> {
    return this.savedSearchService.previewSavedSearch(
      employeeId,
      savedSearchId,
    );
  }
}
