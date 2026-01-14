import { Injectable } from '@nestjs/common';
import { MatchDto } from '../dtos/match.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { Repository } from 'typeorm';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { RpcException } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { UserResponseDTO } from 'apps/user-service/src/dtos/user-response.dto';
import { EmailService } from '@app/common/email/email.service';

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepo: Repository<JobMatching>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly emailService: EmailService,
    private readonly logger: Logger,
  ) {}

  async employeeLikes(matchDto: MatchDto): Promise<any> {
    try {
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

      if (!employee || !company) {
        throw new RpcException({
          message: 'Employee or Company not found.',
          statusCode: 404,
        });
      }

      let match = await this.jobMatchingRepo.findOne({
        where: {
          employee: { id: matchDto.eid },
          company: { id: matchDto.cid },
        },
        relations: ['employee', 'company'],
      });

      if (!match) {
        match = this.jobMatchingRepo.create({
          employee,
          company,
          employeeLiked: true,
          companyLiked: false,
          isMatched: false,
        });
      } else {
        match.employeeLiked = true;
      }

      const becameMatched =
        !match.isMatched && match.employeeLiked && match.companyLiked;
      if (becameMatched) {
        match.isMatched = true;
      }

      const saved = await this.jobMatchingRepo.save(match);

      if (becameMatched) {
        try {
          // const employeePhone = employee.user?.phone ?? employee.phone;
          // const companyPhone = company.user?.phone ?? company.phone;
          const employeeName = employee.username;
          const employeeEmail = employee.user.email;
          const companyEmail = company.user.email;

          await this.emailService.sendEmail({
            from: companyEmail,
            to: employeeEmail,
            subject: 'Matched Message',
            text: `🎉 Match! ${employeeName} likes your company.`,
          });

          // await this.messageService.notifyMatch(
          //   employeePhone,
          //   companyPhone,
          //   company.name,
          //   `${employee.firstname} ${employee.lastname}`,
          //   employeeEmail,
          //   companyEmail
          // );
        } catch (notifyError: any) {
          this.logger.warn(
            `Failed to send match notification: ${notifyError?.message || notifyError}`,
          );
        }
      }

      return saved;
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message: error?.message || 'An error occurred while liking.',
        statusCode: 500,
      });
    }
  }

  async companyLikes(matchDto: MatchDto): Promise<any> {
    try {
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

      if (!employee || !company) {
        throw new RpcException({
          message: 'Employee or Company not found.',
          statusCode: 404,
        });
      }

      let match = await this.jobMatchingRepo.findOne({
        where: {
          employee: { id: matchDto.eid },
          company: { id: matchDto.cid },
        },
        relations: ['employee', 'company'],
      });

      if (!match) {
        match = this.jobMatchingRepo.create({
          employee,
          company,
          employeeLiked: false,
          companyLiked: true,
          isMatched: false,
        });
      } else {
        match.companyLiked = true;
      }

      const becameMatched =
        !match.isMatched && match.employeeLiked && match.companyLiked;
      if (becameMatched) {
        match.isMatched = true;
      }

      const saved = await this.jobMatchingRepo.save(match);

      if (becameMatched) {
        try {
          // const employeePhone = employee.user?.phone ?? employee.phone;
          // const companyPhone = company.user?.phone ?? company.phone;

          const companyName = company.name;
          const companyEmail = company.user.email;
          const employeeEmail = employee.user.email;

          await this.emailService.sendEmail({
            from: employeeEmail,
            to: companyEmail,
            subject: 'Apsara Talent - Matched Messages',
            text: `🎉 Match! ${companyName} likes your profile.`,
          });

          console.log({
            from: companyEmail,
            to: employeeEmail,
            subject: 'Matched Message',
            text: `🎉 Match! ${companyName} likes your profile.`,
          });
          // await this.messageService.notifyMatch(
          //   employeePhone,
          //   companyPhone,
          //   company.name,
          //   `${employee.firstname} ${employee.lastname}`,
          // );
        } catch (notifyError: any) {
          this.logger.warn(
            `Failed to send match notification: ${notifyError?.message || notifyError}`,
          );
        }
      }

      return saved;
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message: error?.message || 'An error occurred while liking.',
        statusCode: 500,
      });
    }
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
          statusCode: 404,
        });

      return employeeLiked.map(
        (empLiked) => new UserResponseDTO(empLiked.company),
      );
    } catch (error) {
      this.logger.error((error as Error).message || 'An error occurred while fetching the employee liked.');
      throw new RpcException({
        message: (error as Error).message,
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
          statusCode: 404,
        });

      return companyLiked.map(
        (cmpLiked) => new UserResponseDTO(cmpLiked.employee),
      );
    } catch (error) {
      this.logger.error((error as Error).message || 'An error occurred while fetching the company liked.');
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async findCurrentEmployeeMatching(eid: string): Promise<UserResponseDTO[]> {
    try {
      const currentEmployeeMatching = await this.jobMatchingRepo.find({
        where: {
          employee: { id: eid },
          isMatched: true,
        },
        relations: ['company.openPositions'],
      });

      if (!currentEmployeeMatching)
        throw new RpcException({
          message: 'There is no matching.',
          statusCode: 404,
        });

      return currentEmployeeMatching.map(
        (user) => new UserResponseDTO(user.company),
      );
    } catch (error) {
      this.logger.error((error as Error).message || 'An error occurred while fetching the employee matching.');
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async findCurrentCompanyMatching(cid: string): Promise<UserResponseDTO[]> {
    try {
      const currentCompanyMatching = await this.jobMatchingRepo.find({
        where: {
          company: { id: cid },
          isMatched: true,
        },
        relations: ['employee.skills'],
      });

      if (!currentCompanyMatching)
        throw new RpcException({
          message: 'There is no matching.',
          statusCode: 404,
        });

      return currentCompanyMatching.map(
        (user) => new UserResponseDTO(user.employee),
      );
    } catch (error) {
      this.logger.error((error as Error).message || 'An error occurred while fetching the company matching.');
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async findCurrentEmployeeMatchingCount(eid: string): Promise<any> {
    try {
      const currentEmployeeMatchingCount = await this.jobMatchingRepo.count({
        where: {
          employee: { id: eid },
          isMatched: true,
        },
      });
      return { totalMatching: currentEmployeeMatchingCount };
    } catch (error) {
      this.logger.error((error as Error).message || 'An error occurred while counting the current employee matching.');
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async findCurrentCompanyMatchingCount(cid: string): Promise<any> {
    try {
      const currentCompanyMatchingCount = await this.jobMatchingRepo.count({
        where: {
          company: { id: cid },
          isMatched: true,
        },
      });
      return { totalMatching: currentCompanyMatchingCount };
    } catch (error) {
      this.logger.error((error as Error).message || 'An error occurred while counting the current company matching.');
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }
}
