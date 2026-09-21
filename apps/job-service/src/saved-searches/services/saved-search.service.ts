import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { SavedSearch } from '@app/common/database/entities/saved-search.entity';
import { ESavedSearchFrequency } from '@app/common/database/enums/saved-search-frequency.enum';
import {
  CreateSavedSearchDTO,
  I_JOB_SERVICE_SERVICE,
  IJobServiceService,
  ISavedSearchService,
  SavedSearchPreviewResponseDTO,
  SavedSearchResponseDTO,
  UpdateSavedSearchDTO,
} from '@app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

/**
 * CRUD + preview for a candidate's saved searches. The digest scheduling
 * lives beside this in `saved-search-digest.service.ts`; keeping the request-
 * scoped surface separate from the cron mirrors how the interview reminder
 * is kept out of the interview service.
 */
@Injectable()
export class SavedSearchService implements ISavedSearchService {
  constructor(
    @InjectRepository(SavedSearch)
    private readonly savedSearchRepo: Repository<SavedSearch>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @Inject(I_JOB_SERVICE_SERVICE)
    private readonly jobService: IJobServiceService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SavedSearchService.name);
  }

  private toResponse(saved: SavedSearch): SavedSearchResponseDTO {
    return new SavedSearchResponseDTO({
      id: saved.id,
      name: saved.name,
      filters: saved.filters,
      frequency: saved.frequency,
      lastNotifiedAt: saved.lastNotifiedAt,
      lastResultJobIds: saved.lastResultJobIds ?? [],
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    });
  }

  /**
   * The employee behind a session user id. Every mutating method needs it, so
   * this failure is centralized rather than repeated with slightly different
   * messages per call site.
   */
  private async loadEmployee(employeeUserId: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { user: { id: employeeUserId } },
    });
    if (!employee) {
      throw new RpcException({
        message: 'Employee not found',
        statusCode: 404,
      });
    }
    return employee;
  }

  private async loadOwned(
    employeeUserId: string,
    savedSearchId: string,
  ): Promise<{ employee: Employee; saved: SavedSearch }> {
    const employee = await this.loadEmployee(employeeUserId);
    const saved = await this.savedSearchRepo.findOne({
      where: { id: savedSearchId, employee: { id: employee.id } },
    });
    if (!saved) {
      throw new RpcException({
        message: 'Saved search not found',
        statusCode: 404,
      });
    }
    return { employee, saved };
  }

  async listSavedSearches(
    employeeUserId: string,
  ): Promise<SavedSearchResponseDTO[]> {
    try {
      const employee = await this.loadEmployee(employeeUserId);
      const rows = await this.savedSearchRepo.find({
        where: { employee: { id: employee.id } },
        order: { createdAt: 'DESC' },
      });
      return rows.map((row) => this.toResponse(row));
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error listing saved searches',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async createSavedSearch(
    employeeUserId: string,
    createSavedSearchDTO: CreateSavedSearchDTO,
  ): Promise<SavedSearchResponseDTO> {
    try {
      const employee = await this.loadEmployee(employeeUserId);

      /*
        Seed `lastResultJobIds` from the current result set so the very first
        digest surfaces "jobs new since you saved this", not the entire result
        page. Without this, a saved search created against a busy query would
        immediately email 20 jobs the user just read on screen.
      */
      const seed = await this.runSearch(
        createSavedSearchDTO.filters as unknown as Record<string, unknown>,
      );

      const created = this.savedSearchRepo.create({
        employee,
        name: createSavedSearchDTO.name.trim(),
        filters: createSavedSearchDTO.filters as unknown as Record<
          string,
          unknown
        >,
        frequency:
          createSavedSearchDTO.frequency ?? ESavedSearchFrequency.DAILY,
        lastNotifiedAt: null,
        lastResultJobIds: seed.jobIds,
      });
      const saved = await this.savedSearchRepo.save(created);
      return this.toResponse(saved);
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error creating saved search',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async updateSavedSearch(
    employeeUserId: string,
    savedSearchId: string,
    updateSavedSearchDTO: UpdateSavedSearchDTO,
  ): Promise<SavedSearchResponseDTO> {
    try {
      const { saved } = await this.loadOwned(employeeUserId, savedSearchId);

      if (typeof updateSavedSearchDTO.name === 'string') {
        saved.name = updateSavedSearchDTO.name.trim();
      }
      if (updateSavedSearchDTO.frequency !== undefined) {
        saved.frequency = updateSavedSearchDTO.frequency;
      }
      if (updateSavedSearchDTO.filters !== undefined) {
        saved.filters = updateSavedSearchDTO.filters as unknown as Record<
          string,
          unknown
        >;
        // Replacing the filters is effectively a new search — reseed the seen
        // set from the fresh results so the next digest reports diffs against
        // the new baseline, not the old one.
        const reseed = await this.runSearch(
          updateSavedSearchDTO.filters as unknown as Record<string, unknown>,
        );
        saved.lastResultJobIds = reseed.jobIds;
      }

      const updated = await this.savedSearchRepo.save(saved);
      return this.toResponse(updated);
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error updating saved search',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async deleteSavedSearch(
    employeeUserId: string,
    savedSearchId: string,
  ): Promise<{ message: string }> {
    try {
      const { saved } = await this.loadOwned(employeeUserId, savedSearchId);
      await this.savedSearchRepo.remove(saved);
      return { message: 'Saved search deleted' };
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error deleting saved search',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async previewSavedSearch(
    employeeUserId: string,
    savedSearchId: string,
  ): Promise<SavedSearchPreviewResponseDTO> {
    try {
      const { saved } = await this.loadOwned(employeeUserId, savedSearchId);

      const { jobIds, total } = await this.runSearch(
        saved.filters as Record<string, unknown>,
      );
      const seen = new Set(saved.lastResultJobIds ?? []);
      const newMatchCount = jobIds.filter((id) => !seen.has(id)).length;

      return new SavedSearchPreviewResponseDTO({
        totalMatches: total,
        newMatchCount,
      });
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error previewing saved search',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  /**
   * Runs the saved filters through `JobService.searchJobs`. Kept internal to
   * this service — the dispatcher calls it too, and both need the same
   * "collapse into ids + total" shape rather than the full paginated result.
   *
   * `pageSize` is capped at 50: a digest lists new jobs, and a saved query
   * that matches thousands should surface the top slice rather than blow the
   * email past every mail host's size limit.
   */
  async runSearch(
    filters: Record<string, unknown>,
  ): Promise<{ jobIds: string[]; total: number }> {
    // Any excludeCompanyIds baked into the saved filters at creation time
    // will still apply — that is the user's expressed preference; leave it.
    const result = await this.jobService.searchJobs({
      ...filters,
      pageSize: Math.min(
        typeof filters.pageSize === 'number' ? filters.pageSize : 50,
        50,
      ),
      page: 1,
    } as never);
    return {
      jobIds: result.data.map((job) => job.id),
      total: result.total,
    };
  }
}
