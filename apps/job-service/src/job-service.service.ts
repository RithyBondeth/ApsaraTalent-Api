import { Job } from '@app/common/database/entities/company/job.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobResponseDTO } from './dtos/job-response.dto';
import { RpcException } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import { SearchJobDto } from './dtos/job-search.dto';

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

  async searchJobs(searchParams: SearchJobDto): Promise<JobResponseDTO[]> {
    try {
      const {
        keyword,
        location,
        companySizeMin,
        companySizeMax,
        postedDateFrom,
        postedDateTo,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = searchParams;

      // Create query builder
      const query = this.jobRepo
        .createQueryBuilder('job')
        .leftJoinAndSelect('job.company', 'company');

      // Keyword search (title or description)
      if (keyword) {
        query.where(
          '(job.title LIKE :keyword OR job.description LIKE :keyword)',
          { keyword: `%${keyword}%` }
        );
      }

      // Location filter
      if (location) {
        query.andWhere('company.location LIKE :location', {
          location: `%${location}%`,
        });
      }

      // Company size range filter
      if (companySizeMin || companySizeMax) {
        query.andWhere('company.companySize BETWEEN :min AND :max', {
          min: companySizeMin || 0,
          max: companySizeMax || 2147483647,
        });
      }

      // Posted date range filter
      if (postedDateFrom || postedDateTo) {
        query.andWhere('job.createdAt BETWEEN :from AND :to', {
          from: postedDateFrom || new Date(0), // Unix epoch as default start
          to: postedDateTo || new Date(), // Current date as default end
        });
      }

      // Sorting
      const validSortFields = ['createdAt', 'title', 'companySize'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      
      if (sortField === 'companySize') {
        query.orderBy(`company.${sortField}`, sortOrder as 'ASC' | 'DESC');
      } else {
        query.orderBy(`job.${sortField}`, sortOrder as 'ASC' | 'DESC');
      }

      const jobs = await query.getMany();

      if (!jobs || jobs.length === 0) {
        throw new RpcException({
          message: 'No jobs found matching your criteria.',
          statusCode: 404,
        });
      }

      return jobs.map((job) => new JobResponseDTO(job));
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        message: 'An error occurred while searching for jobs.',
        statusCode: 500,
      });
    }
  }
}
