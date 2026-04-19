import { Company } from '@app/common/database/entities/company/company.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Interview } from '@app/common/database/entities/interview.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import {
  CreateInterviewDTO,
  GetInterviewsByCompanyDTO,
  GetInterviewsByEmployeeDTO,
  InterviewResponseDTO,
  InterviewStatus,
  UpdateInterviewStatusDTO,
  VALID_STATUS_TRANSITIONS,
} from '@app/contracts/dtos/job';

import { IInterviewService } from '@app/contracts/interfaces/service/job-service.interface';
import { JOB } from '@app/contracts/constants/domain/job.constant';

@Injectable()
export class InterviewService implements IInterviewService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepo: Repository<Interview>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepo: Repository<JobMatching>,
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
    private readonly logger: Logger,
  ) {}

  async createInterview(
    createInterview: CreateInterviewDTO,
  ): Promise<InterviewResponseDTO> {
    try {
      // Only companies can schedule interviews (standard hiring flow)
      if (createInterview.createdBy !== 'company') {
        throw new RpcException({
          message: 'Only companies can schedule interviews.',
          statusCode: 403,
        });
      }

      // Verify that employee and company are matched
      const match = await this.jobMatchingRepo.findOne({
        where: {
          employee: { id: createInterview.employeeId },
          company: { id: createInterview.companyId },
          isMatched: true,
        },
      });

      if (!match) {
        throw new RpcException({
          message: 'You can only schedule interviews with matches.',
          statusCode: 403,
        });
      }

      const [employee, company] = await Promise.all([
        this.employeeRepo.findOne({
          where: { id: createInterview.employeeId },
          relations: ['user'],
        }),
        this.companyRepo.findOne({
          where: { id: createInterview.companyId },
          relations: ['user'],
        }),
      ]);

      if (!employee || !company) {
        throw new RpcException({
          message: 'Employee or Company not found.',
          statusCode: 404,
        });
      }

      const interview = this.interviewRepo.create({
        employee,
        company,
        title: createInterview.title,
        description: createInterview.description,
        scheduledAt: new Date(createInterview.scheduledAt),
        durationMinutes:
          createInterview.durationMinutes || JOB.DEFAULT_INTERVIEW_DURATION,
        location: createInterview.location,
        meetingLink: createInterview.meetingLink,
        status: 'pending',
        createdBy: createInterview.createdBy,
      });

      const saved = await this.interviewRepo.save(interview);

      // Notify the other party
      const targetUserId =
        createInterview.createdBy === 'company'
          ? employee.user?.id
          : company.user?.id;
      const senderName =
        createInterview.createdBy === 'company'
          ? company.name
          : employee.username || employee.firstname;

      if (targetUserId) {
        this.notificationClient.emit(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          {
            userId: targetUserId,
            title: 'Interview Scheduled',
            message: `${senderName} wants to schedule an interview: ${createInterview.title}`,
            type: 'interview',
            data: {
              interviewId: saved.id,
              employeeId: createInterview.employeeId,
              companyId: createInterview.companyId,
            },
            sendPush: true,
          },
        );
      }

      return new InterviewResponseDTO(saved);
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message:
          error?.message || 'An error occurred while creating the interview.',
        statusCode: error?.statusCode || 500,
      });
    }
  }

  async getInterviewsByEmployee(
    dto: GetInterviewsByEmployeeDTO,
  ): Promise<InterviewResponseDTO[]> {
    try {
      const interviews = await this.interviewRepo.find({
        where: { employee: { id: dto.employeeId } },
        relations: ['company'],
        order: { scheduledAt: 'ASC' },
      });
      return interviews.map((interview) => new InterviewResponseDTO(interview));
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message:
          error?.message || 'An error occurred while fetching interviews.',
        statusCode: 500,
      });
    }
  }

  async getInterviewsByCompany(
    dto: GetInterviewsByCompanyDTO,
  ): Promise<InterviewResponseDTO[]> {
    try {
      const interviews = await this.interviewRepo.find({
        where: { company: { id: dto.companyId } },
        relations: ['employee'],
        order: { scheduledAt: 'ASC' },
      });
      return interviews.map((interview) => new InterviewResponseDTO(interview));
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message:
          error?.message || 'An error occurred while fetching interviews.',
        statusCode: 500,
      });
    }
  }

  async updateInterviewStatus(
    updateInterview: UpdateInterviewStatusDTO,
  ): Promise<InterviewResponseDTO> {
    try {
      const interview = await this.interviewRepo.findOne({
        where: { id: updateInterview.interviewId },
        relations: ['employee', 'employee.user', 'company', 'company.user'],
      });

      if (!interview) {
        throw new RpcException({
          message: 'Interview not found.',
          statusCode: 404,
        });
      }

      // ── Access control: verify the requester is involved in this interview ──
      const employeeUserId = interview.employee?.user?.id;
      const companyUserId = interview.company?.user?.id;

      if (
        updateInterview.requestUserId !== employeeUserId &&
        updateInterview.requestUserId !== companyUserId
      ) {
        throw new RpcException({
          message: 'You are not involved in this interview.',
          statusCode: 403,
        });
      }

      // ── Role-based action control ──
      const isEmployee = updateInterview.requestUserId === employeeUserId;
      const isCompany = updateInterview.requestUserId === companyUserId;

      // Employees can only accept or decline pending interviews
      if (
        isEmployee &&
        ![InterviewStatus.ACCEPTED, InterviewStatus.DECLINED].includes(
          updateInterview.status,
        )
      ) {
        throw new RpcException({
          message: 'Employees can only accept or decline interviews.',
          statusCode: 403,
        });
      }

      // Companies can only cancel or mark as completed
      if (
        isCompany &&
        ![InterviewStatus.CANCELLED, InterviewStatus.COMPLETED].includes(
          updateInterview.status,
        )
      ) {
        throw new RpcException({
          message: 'Companies can only cancel or complete interviews.',
          statusCode: 403,
        });
      }

      // ── Status transition validation ──
      const allowedTransitions =
        VALID_STATUS_TRANSITIONS[interview.status] || [];
      if (!allowedTransitions.includes(updateInterview.status)) {
        throw new RpcException({
          message: `Cannot transition from "${interview.status}" to "${updateInterview.status}".`,
          statusCode: 400,
        });
      }

      interview.status = updateInterview.status;
      const saved = await this.interviewRepo.save(interview);

      // Notify both parties about the status change
      const statusLabel =
        updateInterview.status.charAt(0).toUpperCase() +
        updateInterview.status.slice(1);

      [employeeUserId, companyUserId].filter(Boolean).forEach((userId) => {
        this.notificationClient.emit(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          {
            userId,
            title: `Interview ${statusLabel}`,
            message: `Interview "${interview.title}" has been ${updateInterview.status}.`,
            type: 'interview',
            data: { interviewId: interview.id },
            sendPush: true,
          },
        );
      });

      return new InterviewResponseDTO(saved);
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message:
          error?.message ||
          'An error occurred while updating interview status.',
        statusCode: error?.statusCode || 500,
      });
    }
  }
}
