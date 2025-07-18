import { Injectable } from '@nestjs/common';
import { MatchDto } from '../dtos/match.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { Repository } from 'typeorm';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { MessageService } from '@app/common/message/message.service';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepo: Repository<JobMatching>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly messageService: MessageService,
  ) {}

  async employeeLikes(matchDto: MatchDto): Promise<any> {
    const [employee, company] = await Promise.all([
      this.employeeRepo.findOne({
        where: { id: matchDto.eid },
        relations: ['user'],
      }),
      this.companyRepo.findOne({
        where: { id: matchDto.cid },
        relations: ['user'],
      }),
    ]);

    if (!employee || !company)
      throw new RpcException({
        message: 'Employee or Company not found',
        statusCode: 401,
      });

    let match = await this.jobMatchingRepo.findOne({
      relations: ['employee', 'company'],
      where: { employee: { id: matchDto.eid }, company: { id: matchDto.cid } },
    });

    if (!match) {
      match = this.jobMatchingRepo.create({
        employee: employee,
        company: company,
        employeeLiked: true,
        companyLiked: false,
        isMatched: false,
      });
    } else {
      match.employeeLiked = true;
    }

    if (match.companyLiked && match.employeeLiked && !match.isMatched) {
      match.isMatched = true;

      //Notify both parties
      await this.messageService.notifyMatch(
        employee.phone,
        company.phone,
        company.name,
        `${employee.firstname} ${employee.lastname}`,
      );
    }

    return await this.jobMatchingRepo.save(match);
  }

  async companyLikes(matchDto: MatchDto): Promise<any> {
    const [employee, company] = await Promise.all([
      this.employeeRepo.findOne({
        where: { id: matchDto.eid },
        relations: ['user'],
      }),
      this.companyRepo.findOne({
        where: { id: matchDto.cid },
        relations: ['user'],
      }),
    ]);

    if (!employee || !company)
      throw new RpcException({
        message: 'Employee or Company not found',
        statusCode: 401,
      });

    let match = await this.jobMatchingRepo.findOne({
      relations: ['employee', 'company'],
      where: { employee: { id: matchDto.eid }, company: { id: matchDto.cid } },
    });

    if (!match) {
      match = this.jobMatchingRepo.create({
        employee: employee,
        company: company,
        employeeLiked: false,
        companyLiked: true,
        isMatched: false,
      });
    } else {
      match.companyLiked = true;
    }

    if (match.companyLiked && match.employeeLiked && !match.isMatched) {
      match.isMatched = true;

      //Notify both parties
      await this.messageService.notifyMatch(
        employee.phone,
        company.phone,
        company.name,
        `${employee.firstname} ${employee.lastname}`,
      );
    }

    return await this.jobMatchingRepo.save(match);
  }
}
