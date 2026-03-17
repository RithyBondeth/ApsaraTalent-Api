import { Job } from '@app/common/database/entities/company/job.entity';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Brackets, Repository } from 'typeorm';
import { extractSalaryRange } from 'utils/functions/extract-salary-range';
import { JobResponseDTO } from '../dtos/job-response.dto';
import { SearchJobDto } from '../dtos/job-search.dto';

@Injectable()
export class JobServiceService {
  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    private readonly logger: PinoLogger,
  ) {}

  async findAllJobs(): Promise<JobResponseDTO[]> {
    try {
      const jobs = await this.jobRepo.find({
        relations: ['company', 'company.user'],
      });
      if (!jobs)
        throw new RpcException({
          message: "There's no job available.",
          statusCode: 400,
        });
      return jobs.map((job) => new JobResponseDTO(job));
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'An error occurred while fetching the job.',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async searchJobs(searchParams: SearchJobDto): Promise<JobResponseDTO[]> {
    try {
      const {
        keyword,
        location,
        careerScopes,
        companySizeMin,
        companySizeMax,
        postedDateFrom,
        postedDateTo,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        salaryMin,
        salaryMax,
        jobType,
        experienceLevel,
        educationRequired,
      } = searchParams;

      const query = this.jobRepo
        .createQueryBuilder('job')
        .leftJoinAndSelect('job.company', 'company')
        .leftJoinAndSelect('company.careerScopes', 'careerScope')
        .leftJoinAndSelect('company.user', 'user');

      // Keyword
      if (keyword) {
        query.where(
          '(job.title ILIKE :keyword OR job.description ILIKE :keyword)',
          {
            keyword: `%${keyword}%`,
          },
        );
      }

      // Location
      if (location) {
        query.andWhere('company.location ILIKE :location', {
          location: `%${location}%`,
        });
      }

      // Company size
      if (companySizeMin || companySizeMax) {
        query.andWhere('company.companySize BETWEEN :min AND :max', {
          min: companySizeMin || 0,
          max: companySizeMax || 2147483647,
        });
      }

      // Dates
      if (postedDateFrom || postedDateTo) {
        const fromDate = postedDateFrom
          ? new Date(postedDateFrom)
          : new Date(0);
        const toDate = postedDateTo ? new Date(postedDateTo) : new Date();

        query.andWhere('job.createdAt BETWEEN :from AND :to', {
          from: fromDate,
          to: toDate,
        });
      }

      // Job type
      if (jobType && jobType.length > 0) {
        query.andWhere(
          new Brackets((qb) => {
            jobType.forEach((type, index) => {
              if (index === 0) {
                qb.where('job.type ILIKE :type_' + index, {
                  ['type_' + index]: `%${type}%`,
                });
              } else {
                qb.orWhere('job.type ILIKE :type_' + index, {
                  ['type_' + index]: `%${type}%`,
                });
              }
            });
          }),
        );
      }

      // Experience Level
      if (
        experienceLevel &&
        experienceLevel !== 'All' &&
        experienceLevel !== ''
      ) {
        const mappedExps = [experienceLevel];

        // Map modern UI strings to legacy database strings to catch old records
        if (experienceLevel === '1 - 2 years') {
          mappedExps.push(
            '1 - 3 years',
            '1+ year',
            '2+ years',
            'More than 2 years',
          );
        } else if (experienceLevel === '3 - 5 years') {
          mappedExps.push('1 - 3 years');
        } else if (experienceLevel === '6 - 10 years') {
          mappedExps.push('5 - 10 years');
        }

        query.andWhere('job.experienceRequired IN (:...mappedExps)', {
          mappedExps,
        });
      }

      // Education
      if (educationRequired && educationRequired.length > 0) {
        query.andWhere(
          new Brackets((qb) => {
            educationRequired.forEach((edu, index) => {
              if (index === 0) {
                qb.where(
                  'LOWER(job.educationRequired) ILIKE :education_' + index,
                  {
                    ['education_' + index]: `%${edu.toLowerCase()}%`,
                  },
                );
              } else {
                qb.orWhere(
                  'LOWER(job.educationRequired) ILIKE :education_' + index,
                  {
                    ['education_' + index]: `%${edu.toLowerCase()}%`,
                  },
                );
              }
            });
          }),
        );
      }

      // Career scopes
      if (careerScopes && careerScopes.length > 0) {
        query.andWhere('careerScope.name IN (:...careerScopes)', {
          careerScopes,
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

      let jobs = await query.getMany();

      // Post-query salary filtering
      if (salaryMin !== undefined || salaryMax !== undefined) {
        const min = salaryMin ?? 0;
        const max = salaryMax ?? Number.MAX_SAFE_INTEGER;

        jobs = jobs.filter((job) => {
          if (!job.salary) return false;
          const [jobMin, jobMax] = extractSalaryRange(job.salary);
          return jobMin <= max && jobMax >= min;
        });
      }

      if (!jobs.length) {
        throw new RpcException({
          message: 'No jobs found matching your criteria.',
          statusCode: 404,
        });
      }

      return jobs.map((job) => new JobResponseDTO(job));
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while searching for jobs.',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }
}
