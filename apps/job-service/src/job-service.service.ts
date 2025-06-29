import { Job } from '@app/common/database/entities/company/job.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobResponseDTO } from './dtos/job-response.dto';
import { RpcException } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import { SearchJobDto } from './dtos/job-search.dto';

function extractSalaryRange(salaryStr: string | null | undefined): [number, number] {
  if (!salaryStr) return [0, 0];

  try {
    const match = salaryStr.match(/(\d[\d,]*)\$?\s*-\s*(\d[\d,]*)\$?/);
    if (!match) return [0, 0];

    const min = parseInt(match[1].replace(/,/g, ''), 10);
    const max = parseInt(match[2].replace(/,/g, ''), 10);
    return [min, max];
  } catch {
    return [0, 0];
  }
}

@Injectable()
export class JobServiceService {
  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    private readonly logger: PinoLogger,
  ) {}

  async findAllJobs(): Promise<JobResponseDTO[]> {
    try {
      const jobs = await this.jobRepo.find({ relations: ['company', 'company.user'] });
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
        experienceRequired,
        educationRequired,
      } = searchParams;
  
      const query = this.jobRepo
        .createQueryBuilder('job')
        .leftJoinAndSelect('job.company', 'company')
        .leftJoinAndSelect('company.careerScopes', 'careerScope')
        .leftJoinAndSelect('company.user', 'user');
  
      // Keyword
      if (keyword) {
        query.where('(job.title LIKE :keyword OR job.description LIKE :keyword)', {
          keyword: `%${keyword}%`,
        });
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
        const fromDate = postedDateFrom ? new Date(postedDateFrom) : new Date(0);
        const toDate = postedDateTo ? new Date(postedDateTo) : new Date();
  
        query.andWhere('job.createdAt BETWEEN :from AND :to', {
          from: fromDate,
          to: toDate,
        });
      }
  
      // Job type
      if (jobType) {
        query.andWhere('job.type LIKE :type', { 
          type: `%${jobType}%`
        });
      }
  
      // Experience
      if (experienceRequired) {
        query.andWhere('job.experienceRequired LIKE :experience', {
          experience: `%${experienceRequired}%`,
        });
      }
  
      // Education
      if (educationRequired) {
        query.andWhere('job.educationRequired LIKE :education', {
          education: `%${educationRequired}%`,
        });
      }
  
      // Career scopes
      if (careerScopes && careerScopes.length > 0) {
        query.andWhere('careerScope.name IN (:...careerScopes)', { careerScopes });
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


      const salaryMinNum = salaryMin ? parseInt(salaryMin as any, 10) : undefined;
      const salaryMaxNum = salaryMax ? parseInt(salaryMax as any, 10) : undefined;
      console.log(salaryMin, salaryMax);
      // Post-query salary filtering
      if (salaryMinNum !== undefined || salaryMaxNum !== undefined) {
        const min = salaryMinNum || 0;
        const max = salaryMaxNum || Number.MAX_SAFE_INTEGER;
      
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
