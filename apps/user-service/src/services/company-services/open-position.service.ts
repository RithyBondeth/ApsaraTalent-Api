import { Company } from '@app/common/database/entities/company/company.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

@Injectable()
export class OpenPositionService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(Job) private readonly jobRepository: Repository<Job>,
  ) {}

  async removeOpenPosition(companyId: string, opId: string): Promise<any> {
    try {
      const removedJob = await this.jobRepository.findOne({
        where: { id: opId, company: { id: companyId } },
      });

      if (!removedJob)
        throw new RpcException({
          statusCode: 401,
          message: "There's no open position with this id",
        });

      this.jobRepository.remove(removedJob);
      await this.jobRepository.save(removedJob);

      return {
        message: `${removedJob.title} position was removed successfully`,
      };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message:
          "An error occurred while removing the company's open positions.",
        statusCode: 500,
      });
    }
  }
}
