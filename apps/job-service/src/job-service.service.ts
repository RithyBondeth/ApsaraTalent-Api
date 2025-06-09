import { Job } from '@app/common/database/entities/company/job.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class JobServiceService {
  constructor(@InjectRepository(Job) private readonly jobRepo: Repository<Job>){}
  async findAllJobs() {
    const jobs = await this.jobRepo.find({ relations: ['company'] });
    return jobs;
  }
}
