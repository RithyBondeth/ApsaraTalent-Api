import {
  CreateSavedSearchDTO,
  SavedSearchPreviewResponseDTO,
  SavedSearchResponseDTO,
  UpdateSavedSearchDTO,
} from '@app/contracts/dtos/job/saved-search/saved-search.dto';

/**
 * The employee-facing surface for saving a search and letting a periodic
 * digest email surface new matches. The RPC surface takes the employee id as
 * a separate arg so the gateway can pull it from the auth session — the
 * pattern mirrors `applications`.
 */
export interface ISavedSearchController {
  listSavedSearches(req?: unknown): Promise<SavedSearchResponseDTO[]>;
  createSavedSearch(
    createSavedSearchDTO: CreateSavedSearchDTO,
    req?: unknown,
  ): Promise<SavedSearchResponseDTO>;
  updateSavedSearch(
    savedSearchId: string,
    updateSavedSearchDTO: UpdateSavedSearchDTO,
    req?: unknown,
  ): Promise<SavedSearchResponseDTO>;
  deleteSavedSearch(
    savedSearchId: string,
    req?: unknown,
  ): Promise<{ message: string }>;
  previewSavedSearch(
    savedSearchId: string,
    req?: unknown,
  ): Promise<SavedSearchPreviewResponseDTO>;
}

export interface ISavedSearchRpcController {
  listSavedSearches(employeeId: string): Promise<SavedSearchResponseDTO[]>;
  createSavedSearch(
    employeeId: string,
    createSavedSearchDTO: CreateSavedSearchDTO,
  ): Promise<SavedSearchResponseDTO>;
  updateSavedSearch(
    employeeId: string,
    savedSearchId: string,
    updateSavedSearchDTO: UpdateSavedSearchDTO,
  ): Promise<SavedSearchResponseDTO>;
  deleteSavedSearch(
    employeeId: string,
    savedSearchId: string,
  ): Promise<{ message: string }>;
  previewSavedSearch(
    employeeId: string,
    savedSearchId: string,
  ): Promise<SavedSearchPreviewResponseDTO>;
}
