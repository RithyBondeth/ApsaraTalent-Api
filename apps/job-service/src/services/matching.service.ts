import { Injectable } from '@nestjs/common';
import { MatchDto } from '../dtos/match.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { Repository } from 'typeorm';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { MessageService } from '@app/common/message/message.service';
import { RpcException } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { UserResponseDTO } from 'apps/user-service/src/dtos/user-response.dto';

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
    private readonly logger: Logger,
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

  async findCurrentEmployeeLiked(eid: string): Promise<UserResponseDTO[]> {
    try {
      const employeeLiked = await this.jobMatchingRepo.find({
        where: {
          employee: { id: eid },
          employeeLiked: true,
        },
      });

      if (!employeeLiked)
        throw new RpcException({
          message: 'Employee Liked not found',
          statusCode: 401,
        });

      return employeeLiked.map(
        (empLiked) => new UserResponseDTO(empLiked.company),
      );
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        message: 'An error occurred while fetching the employee liked.',
        statusCode: 500,
      });
    }
  }

  async findCurrentCompanyLiked(cid: string): Promise<UserResponseDTO[]> {
    try {
      const companyLiked = await this.jobMatchingRepo.find({
        where: {
          company: { id: cid },
          companyLiked: true,
        },
      });

      if (!companyLiked)
        throw new RpcException({
          message: 'Company Liked not found',
          statusCode: 401,
        });

      return companyLiked.map(
        (cmpLiked) => new UserResponseDTO(cmpLiked.employee),
      );
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        message: 'An error occurred while fetching the company liked.',
        statusCode: 500,
      });
    }
  }
}
