import { Application } from '@app/common/database/entities/application.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { EApplicationStatus } from '@app/common/database/enums/application-status.enum';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  IApplicationService,
  ApplyApplicationDTO,
  ApplyApplicationResponseDTO,
  GetApplicationResponseDTO,
  UpdateApplicationStatusDTO,
  UpdateApplicationStatusResponseDTO,
} from '@app/contracts';

@Injectable()
export class ApplicationService implements IApplicationService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ApplicationService.name);
  }

  async applyApplication(
    employeeId: string,
    applyApplicationDTO: ApplyApplicationDTO,
  ): Promise<ApplyApplicationResponseDTO> {
    try {
      const employee = await this.employeeRepo.findOne({
        where: { user: { id: employeeId } },
      });
      if (!employee)
        throw new RpcException({
          message: 'Employee not found',
          statusCode: 404,
        });

      const job = await this.jobRepo.findOne({
        where: { id: applyApplicationDTO.jobId },
        relations: ['company'],
      });
      if (!job)
        throw new RpcException({ message: 'Job not found', statusCode: 404 });

      const existing = await this.applicationRepo.findOne({
        where: {
          employee: { id: employee.id },
          job: { id: applyApplicationDTO.jobId },
        },
      });
      if (existing) {
        throw new RpcException({
          message: 'You have already applied to this job',
          statusCode: 409,
        });
      }

      const application = this.applicationRepo.create({
        employee,
        job,
        status: EApplicationStatus.PENDING,
        coverLetterNote: applyApplicationDTO.coverLetterNote ?? null,
      });

      const saved = await this.applicationRepo.save(application);

      return new ApplyApplicationResponseDTO({
        id: saved.id,
        status: saved.status,
        coverLetterNote: saved.coverLetterNote ?? undefined,
        appliedAt: saved.appliedAt,
        jobId: job.id,
        jobTitle: job.title,
        employeeId: employee.id,
      });
    } catch (error) {
      this.logger.error((error as Error).message || 'Error applying to job');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async getMyApplications(
    employeeId: string,
  ): Promise<GetApplicationResponseDTO[]> {
    try {
      const employee = await this.employeeRepo.findOne({
        where: { user: { id: employeeId } },
      });
      if (!employee)
        throw new RpcException({
          message: 'Employee not found',
          statusCode: 404,
        });

      const applications = await this.applicationRepo.find({
        where: { employee: { id: employee.id } },
        relations: ['job', 'job.company'],
        order: { appliedAt: 'DESC' },
      });

      return applications.map(
        (app) =>
          new GetApplicationResponseDTO({
            id: app.id,
            status: app.status,
            coverLetterNote: app.coverLetterNote ?? undefined,
            appliedAt: app.appliedAt,
            jobId: app.job?.id,
            jobTitle: app.job?.title,
          }),
      );
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error fetching applications',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async getJobApplications(
    jobId: string,
    companyId: string,
  ): Promise<GetApplicationResponseDTO[]> {
    try {
      const job = await this.jobRepo.findOne({
        where: { id: jobId, company: { id: companyId } },
        relations: ['company'],
      });
      if (!job)
        throw new RpcException({
          message: 'Job not found or access denied',
          statusCode: 404,
        });

      const applications = await this.applicationRepo.find({
        where: { job: { id: jobId } },
        relations: ['employee', 'employee.user'],
        order: { appliedAt: 'DESC' },
      });

      return applications.map(
        (app) =>
          new GetApplicationResponseDTO({
            id: app.id,
            status: app.status,
            coverLetterNote: app.coverLetterNote ?? undefined,
            appliedAt: app.appliedAt,
            jobId,
            jobTitle: job.title,
            employeeId: app.employee?.id,
            employeeName: app.employee?.username,
          }),
      );
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error fetching job applications',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async updateApplicationStatus(
    companyId: string,
    updateApplicationStatusDTO: UpdateApplicationStatusDTO,
  ): Promise<UpdateApplicationStatusResponseDTO> {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id: updateApplicationStatusDTO.applicationId },
        relations: ['job', 'job.company', 'employee'],
      });

      if (!application || application.job?.company?.id !== companyId) {
        throw new RpcException({
          message: 'Application not found or access denied',
          statusCode: 404,
        });
      }

      application.status = updateApplicationStatusDTO.status;
      const updated = await this.applicationRepo.save(application);

      return new UpdateApplicationStatusResponseDTO({
        id: updated.id,
        status: updated.status,
        coverLetterNote: updated.coverLetterNote ?? undefined,
        appliedAt: updated.appliedAt,
        jobId: application.job?.id,
        jobTitle: application.job?.title,
        employeeId: application.employee?.id,
        employeeName: application.employee?.username,
      });
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error updating application status',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async withdrawApplication(
    employeeId: string,
    applicationId: string,
  ): Promise<{ message: string }> {
    try {
      const employee = await this.employeeRepo.findOne({
        where: { user: { id: employeeId } },
      });
      if (!employee)
        throw new RpcException({
          message: 'Employee not found',
          statusCode: 404,
        });

      const application = await this.applicationRepo.findOne({
        where: { id: applicationId, employee: { id: employee.id } },
      });

      if (!application) {
        throw new RpcException({
          message: 'Application not found or access denied',
          statusCode: 404,
        });
      }

      if (application.status !== EApplicationStatus.PENDING) {
        throw new RpcException({
          message: 'Only pending applications can be withdrawn',
          statusCode: 400,
        });
      }

      await this.applicationRepo.delete(applicationId);

      return { message: 'Application withdrawn successfully' };
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error withdrawing application',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }
}
