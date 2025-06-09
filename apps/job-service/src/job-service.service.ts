import { Job } from '@app/common/database/entities/company/job.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobResponseDTO } from './dtos/job-response.dto';
import { RpcException } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class JobServiceService {
  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    private readonly logger: PinoLogger,
  ) {}

  async findAllJobs(): Promise<JobResponseDTO[]> {
    try {
      const jobs = await this.jobRepo.find({ relations: ['company'] });
      if (!jobs)
        throw new RpcException({
          message: "There's no job available.",
          statusCode: 400,
        });
      return jobs.map((job) => new JobResponseDTO(job));
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        message: 'An error occurred while fetching the job.',
        statusCode: 500,
      });
    }
  }
}
