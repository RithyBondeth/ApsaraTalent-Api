import { Job } from '@app/common/database/entities/company/job.entity';
import { CacheInvalidationService } from '@app/common/redis/cache-invalidation.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  RemoveOpenPositionDTO,
  RemoveOpenPositionResponseDTO,
} from '@app/contracts/dtos/user';
import { IOpenPositionService } from '@app/contracts/interfaces/service/user-service.interface';

@Injectable()
export class OpenPositionService implements IOpenPositionService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(Job) private readonly jobRepository: Repository<Job>,
    private readonly cacheInvalidationService: CacheInvalidationService,
  ) {}

  async removeOpenPosition(
    removeOpenPositionDTO: RemoveOpenPositionDTO,
  ): Promise<RemoveOpenPositionResponseDTO> {
    const { companyId, opId } = removeOpenPositionDTO;
    try {
      const removedJob = await this.jobRepository.findOne({
        where: { id: opId, company: { id: companyId } },
        relations: ['company'],
      });

      if (!removedJob)
        throw new RpcException({
          statusCode: 404,
          message: "There's no open position with this id.",
        });

      await this.jobRepository.delete(opId);

      // Invalidate cache after deletion
      await this.cacheInvalidationService.invalidateCompanyCache(companyId);

      return new RemoveOpenPositionResponseDTO({
        message: `${removedJob.title} position was removed successfully.`,
      });
    } catch (error) {
      // Handle error
      this.logger.error(
        (error as Error).message ||
          "An error occurred while removing the company's open positions.",
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message:
          "An error occurred while removing the company's open positions.",
        statusCode: 500,
      });
    }
  }
}
