import { Job } from '@app/common/database/entities/company/job.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobResponseDTO } from '../dtos/job-response.dto';
import { RpcException } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import { SearchJobDto } from '../dtos/job-search.dto';
import { extractSalaryRange } from 'utils/functions/extract-salary-range';

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
        experienceRequiredMin,
        experienceRequiredMax,
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
          '(job.title LIKE :keyword OR job.description LIKE :keyword)',
          {
            keyword: `%${keyword}%`,
          },
        );
      }

      // Location
      if (location) {
        query.andWhere('company.location LIKE :location', {
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
      if (jobType) {
        query.andWhere('job.type LIKE :type', {
          type: `%${jobType}%`,
        });
      }

      // Experience range
      if (experienceRequiredMin !== undefined) {
        query.andWhere('job.experienceRequired >= :minExp', {
          minExp: experienceRequiredMin,
        });
      }

      if (experienceRequiredMax !== undefined) {
        query.andWhere('job.experienceRequired <= :maxExp', {
          maxExp: experienceRequiredMax,
        });
      }

      // Education
      if (educationRequired) {
        query.andWhere(
          'LOWER(job.educationRequired) LIKE :education', // MySQL / SQLite / generic
          // For PostgreSQL you can shorten to:  'job.educationRequired ILIKE :education'
          { education: `%${educationRequired.toLowerCase()}%` },
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
      this.logger.error(error.message);
      throw new RpcException({
        message: error.message,
        statusCode: 500,
      });
    }
  }
}
